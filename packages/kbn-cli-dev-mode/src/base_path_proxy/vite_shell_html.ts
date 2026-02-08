/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates a self-contained HTML page that shows the "Loading Elastic"
 * animation while pre-loading all Vite modules in the background.
 *
 * This page is served by the base path proxy when:
 *   - The Vite dev server IS ready
 *   - The Kibana server is NOT yet ready
 *
 * It overlaps module loading with server startup: while the server is
 * still booting, the browser fetches and transforms ~8000 modules from
 * Vite. When the server becomes ready, the page reloads and the browser
 * serves most modules from its HTTP cache, dramatically reducing the
 * perceived startup time.
 */
export function generateViteShellHtml(options: {
  basePath: string;
  viteUrl: string;
  pluginIds: string[];
}): string {
  const { basePath, viteUrl, pluginIds } = options;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
  <meta name="viewport" content="width=device-width">
  <title>Elastic</title>
  <style>
    *, *:before, *:after { box-sizing: border-box; }
    html, body, div, span, svg { margin: 0; padding: 0; border: none; vertical-align: baseline; }
    body, html { width: 100%; height: 100%; margin: 0; display: block; }
    html { background-color: #F6F9FC; }
    @media (prefers-color-scheme: dark) { html { background-color: #07101F; } }
    .kbnWelcomeView {
      line-height: 1.5; height: 100%;
      display: flex; flex: 1 0 auto; flex-direction: column;
      align-items: center; justify-content: center;
    }
    .kbnWelcomeText {
      display: block; font-size: 14px; font-family: Inter, BlinkMacSystemFont, Helvetica, Arial, sans-serif;
      line-height: 40px !important; height: 40px !important;
      color: #5A6D8C;
    }
    @media (prefers-color-scheme: dark) { .kbnWelcomeText { color: #8E9FBC; } }
    .kbnLoaderWrap {
      text-align: center; line-height: 1;
      font-family: Inter, BlinkMacSystemFont, Helvetica, Arial, sans-serif;
      letter-spacing: -.005em; font-weight: 400;
    }
    .kbnLoaderWrap svg { width: 64px; height: 64px; margin: auto; line-height: 1; }
    .kbnProgress {
      display: inline-block; position: relative;
      width: 32px; height: 4px; overflow: hidden; line-height: 1;
      background-color: #ECF1F9;
    }
    @media (prefers-color-scheme: dark) { .kbnProgress { background-color: #172336; } }
    .kbnProgress:before {
      position: absolute; content: ''; height: 4px; width: 100%;
      top: 0; bottom: 0; left: 0;
      transform: scaleX(0) translateX(0%);
      animation: kbnProgress 1s cubic-bezier(.694, .0482, .335, 1) infinite;
      background-color: #0B64DD;
    }
    @media (prefers-color-scheme: dark) { .kbnProgress:before { background-color: #599DFF; } }
    @keyframes kbnProgress {
      0% { transform: scaleX(1) translateX(-100%); }
      100% { transform: scaleX(1) translateX(100%); }
    }
    @media (prefers-reduced-motion) { .kbnProgress { display: none; } }
    .kbnShellStatus {
      margin-top: 12px; font-size: 12px;
      font-family: Inter, BlinkMacSystemFont, Helvetica, Arial, sans-serif;
      color: #98A2B3; text-align: center;
    }
    @media (prefers-color-scheme: dark) { .kbnShellStatus { color: #5A6D8C; } }
  </style>
</head>
<body>
  <div class="kbnWelcomeView" id="kbn_loading_message">
    <div class="kbnLoaderWrap">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
        <g fill="none">
          <path fill="#FDD009" d="M11.9338171,13.1522761 L19.2872353,16.5080972 L26.7065664,10.0005147 C26.8139592,9.46384495 26.866377,8.92859725 26.866377,8.36846422 C26.866377,3.78984954 23.1459864,0.0647302752 18.5719941,0.0647302752 C15.8357526,0.0647302752 13.2836129,1.41337248 11.7323847,3.67480826 L10.4983628,10.0839872 L11.9338171,13.1522761 Z"/>
          <path fill="#23BAB1" d="M4.32214501,20.9473399 C4.21475229,21.4841518 4.1596354,22.0410142 4.1596354,22.6044179 C4.1596354,27.1948353 7.89096419,30.9300509 12.4774572,30.9300509 C15.2361432,30.9300509 17.8007837,29.5687528 19.3495969,27.2841381 L20.5743853,20.8965739 L18.9399136,17.7698399 L11.5573744,14.401505 L4.32214501,20.9473399 Z"/>
          <path fill="#EE5097" d="M4.27553714,8.20847294 L9.31503995,9.3995555 L10.4190826,3.6639867 C9.73040545,3.1371289 8.88035513,2.84874358 8.00601361,2.84874358 C5.81596922,2.84874358 4.0348979,4.63252339 4.0348979,6.82484908 C4.0348979,7.30904633 4.11572655,7.77333532 4.27553714,8.20847294"/>
          <path fill="#17A7E0" d="M3.83806807,9.40996468 C1.58651435,10.1568087 0.0210807931,12.3172812 0.0210807931,14.6937583 C0.0210807931,17.0078087 1.45071086,19.0741436 3.5965765,19.8918041 L10.6668813,13.494428 L9.36879313,10.717795 L3.83806807,9.40996468 Z"/>
          <path fill="#92C73D" d="M20.6421734,27.2838537 C21.3334075,27.8156885 22.1793383,28.1057803 23.0428837,28.1057803 C25.232786,28.1057803 27.0138574,26.3228537 27.0138574,24.130528 C27.0138574,23.6470417 26.9331708,23.1827528 26.7732181,22.7477573 L21.7379769,21.5681931 L20.6421734,27.2838537 Z"/>
          <path fill="#0678A0" d="M21.6667227,20.2469532 L27.2099485,21.5446872 C29.4623545,20.7995495 31.0277881,18.6382239 31.0277881,16.2608936 C31.0277881,13.9511092 29.5947487,11.8871917 27.4447635,11.0719486 L20.1946185,17.4303615 L21.6667227,20.2469532 Z"/>
        </g>
      </svg>
      <div class="kbnWelcomeText">Loading Elastic</div>
      <div class="kbnProgress"></div>
      <div class="kbnShellStatus" id="kbn_shell_status">Pre-loading modules while server starts...</div>
    </div>
  </div>

  <script type="module">
    const viteUrl = ${JSON.stringify(viteUrl)};
    const basePath = ${JSON.stringify(basePath)};
    const allPluginIds = ${JSON.stringify(pluginIds)};
    const statusEl = document.getElementById('kbn_shell_status');

    let serverReady = false;
    let modulesLoaded = false;
    let esAvailable = null; // null = checking, true/false = result
    let esHost = '';
    let loadedCount = 0;

    function updateStatus() {
      const parts = [];

      // Elasticsearch status
      if (esAvailable === null) {
        parts.push('Checking Elasticsearch...');
      } else if (esAvailable) {
        parts.push('\\u2705 Elasticsearch (' + esHost + ')');
      } else {
        parts.push('\\u274C Elasticsearch not found at ' + esHost);
      }

      // Module loading status
      if (modulesLoaded) {
        parts.push('\\u2705 Modules ready');
      } else {
        parts.push('Pre-loading modules (' + loadedCount + '/' + allPluginIds.length + ')');
      }

      // Server status
      if (serverReady) {
        parts.push('\\u2705 Server ready');
      } else {
        parts.push('Waiting for server...');
      }

      statusEl.textContent = parts.join(' \\u00B7 ');
    }

    function maybeReload() {
      if (serverReady && modulesLoaded) {
        statusEl.textContent = 'Ready! Loading Kibana...';
        // Short delay to let the browser finalize any pending cache writes
        setTimeout(() => window.location.reload(), 100);
      }
    }

    // ── Check Elasticsearch connectivity ─────────────────────────────
    // Calls the proxy's server-side ES check to avoid CORS issues.
    async function checkElasticsearch() {
      try {
        const resp = await fetch(basePath + '/__internal/es_status');
        if (resp.ok) {
          const data = await resp.json();
          esAvailable = data.available;
          esHost = data.host || 'unknown';
        } else {
          esAvailable = false;
        }
      } catch {
        esAvailable = false;
      }
      updateStatus();

      // Re-check every 5 seconds if ES wasn't found
      if (!esAvailable) {
        setTimeout(checkElasticsearch, 5000);
      }
    }

    // ── Wait for server readiness ────────────────────────────────────
    // Polls the proxy's readiness endpoint until the Kibana server is up.
    async function waitForServer() {
      while (true) {
        try {
          const resp = await fetch(basePath + '/__internal/shell_ready', {
            headers: { 'kbn-xsrf': 'true' },
          });
          if (resp.ok) {
            serverReady = true;
            updateStatus();
            maybeReload();
            return;
          }
        } catch (e) {
          // Connection refused or network error — retry
        }
        await new Promise(r => setTimeout(r, 500));
      }
    }

    // ── Pre-load modules from Vite ───────────────────────────────────
    async function preloadModules() {
      try {
        // Load Vite client for HMR connection
        await import(viteUrl + '/@vite/client');

        // Load React Fast Refresh runtime
        const RefreshRuntime = await import(viteUrl + '/@react-refresh');
        RefreshRuntime.default.injectIntoGlobalHook(window);
        window.$RefreshReg$ = () => {};
        window.$RefreshSig$ = () => (type) => type;
        window.__vite_plugin_react_preamble_installed__ = true;

        // Load core entry point (this triggers many transitive imports)
        await import(viteUrl + '/src/core/packages/root/browser-internal/index.ts');
        loadedCount++;
        updateStatus();

        // Load all plugin bundles in parallel batches
        const batchSize = 15;
        for (let i = 0; i < allPluginIds.length; i += batchSize) {
          const batch = allPluginIds.slice(i, i + batchSize);
          await Promise.allSettled(
            batch.map(id =>
              import(viteUrl + '/@kbn-plugin/' + id + '/index.ts')
                .then(() => { loadedCount++; updateStatus(); })
                .catch(() => { loadedCount++; updateStatus(); })
            )
          );
        }

        modulesLoaded = true;
        updateStatus();
        maybeReload();
      } catch (err) {
        console.warn('[kbn-shell] Module pre-loading error (non-fatal):', err);
        modulesLoaded = true;
        updateStatus();
        maybeReload();
      }
    }

    // Start all operations in parallel
    updateStatus();
    checkElasticsearch();
    waitForServer();
    preloadModules();
  </script>
</body>
</html>`;
}
