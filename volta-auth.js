// ══════════════════════════════════════════════════════
//  volta-auth.js — Include this in EVERY protected page
//  <script src="volta-auth.js"></script>  ← before page JS
// ══════════════════════════════════════════════════════

const VoltaAuth = (() => {

  // ── Get stored token ────────────────────────────
  function getToken() {
    return localStorage.getItem('volta_token');
  }

  // ── Get stored user ─────────────────────────────
  function getUser() {
    return JSON.parse(localStorage.getItem('volta_user') || 'null');
  }

  // ── Check if session is still valid ─────────────
  function isLoggedIn() {
    const token   = getToken();
    const expires = localStorage.getItem('volta_expires');
    return token && expires && Date.now() < Number(expires);
  }

  // ── Logout and redirect to login ────────────────
  function logout(reason) {
    // Try to notify backend (fire-and-forget)
    const token = getToken();
    if (token) {
      fetch(`${window.BACKEND_URL || 'http://localhost:3000'}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(() => {});
    }

    localStorage.removeItem('volta_token');
    localStorage.removeItem('volta_user');
    localStorage.removeItem('volta_expires');

    const url = reason ? `volta_login.html?msg=${encodeURIComponent(reason)}` : 'volta_login.html';
    window.location.href = url;
  }

  // ── Guard a page — call at the top of any protected page ──
  // allowedRoles: [] means any authenticated user
  function guard(allowedRoles = []) {
    if (!isLoggedIn()) {
      logout('session_expired');
      return null;
    }
    const user = getUser();
    if (allowedRoles.length && !allowedRoles.includes(user?.role)) {
      alert(`Access denied. This page requires: ${allowedRoles.join(' or ')} role.`);
      logout();
      return null;
    }
    return user;
  }

  // ── Attach Authorization header to every fetch ──
  // Usage: const res = await VoltaAuth.fetch('/api/alert/history');
  async function authFetch(url, options = {}) {
    const token = getToken();
    if (!token) { logout('session_expired'); return null; }

    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
        'Authorization': `Bearer ${token}`,
      }
    });

    // Token expired → kick to login
    if (res.status === 401) {
      const data = await res.json().catch(() => ({}));
      logout(data.expired ? 'session_expired' : 'unauthorized');
      return null;
    }

    return res;
  }

  // ── Inject user info into page header ───────────
  function renderUserBadge(containerId) {
    const user = getUser();
    const el   = document.getElementById(containerId);
    if (!el || !user) return;
    el.innerHTML = `
      <span style="font-size:12px;color:var(--muted,#888);font-family:monospace;letter-spacing:1px">
        ${user.username}
        <span style="background:rgba(0,212,255,0.12);color:#00d4ff;padding:2px 8px;border-radius:4px;
          font-size:10px;margin-left:4px;text-transform:uppercase">${user.role}</span>
      </span>
      <button onclick="VoltaAuth.logout()"
        style="background:rgba(255,60,60,0.1);border:1px solid rgba(255,60,60,0.2);
        color:#ff8080;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:11px;
        font-family:inherit;letter-spacing:1px;margin-left:10px;">
        Sign Out
      </button>
    `;
  }

  return { getToken, getUser, isLoggedIn, logout, guard, authFetch, renderUserBadge };
})();
