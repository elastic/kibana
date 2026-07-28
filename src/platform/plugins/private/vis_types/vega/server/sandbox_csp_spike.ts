/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomBytes } from 'crypto';
import type { CoreSetup } from '@kbn/core/server';

const SPIKE_BASE_PATH = '/api/vis_type_vega/sandbox_csp_spike';
const HOST_ROUTE_PATH = `${SPIKE_BASE_PATH}/host`;
const FRAME_ROUTE_PATH = `${SPIKE_BASE_PATH}/frame`;
const PAYLOAD_ROUTE_PATH = `${SPIKE_BASE_PATH}/payload.js`;

const PUBLIC_SPIKE_ROUTE_OPTIONS = {
  access: 'public',
} as const;

const SPIKE_ROUTE_SECURITY = {
  authc: {
    enabled: false,
    reason: 'Temporary Vega sandbox CSP spike route serves only static test HTML and scripts.',
  },
  authz: {
    enabled: false,
    reason: 'Temporary Vega sandbox CSP spike route does not access user data.',
  },
} as const;

const HTML_HEADERS = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'no-store',
} as const;

const SCRIPT_HEADERS = {
  'content-type': 'text/javascript; charset=utf-8',
  'cache-control': 'no-store',
} as const;

const createNonce = () => randomBytes(16).toString('base64');

const createFrameCsp = (nonce: string) =>
  `default-src 'none'; script-src 'nonce-${nonce}' 'strict-dynamic'`;

const getPathname = (url: string) => new URL(url, 'http://localhost').pathname;

const renderHostDocument = () => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Vega sandbox CSP spike host</title>
  </head>
  <body>
    <h1>Vega sandbox CSP spike host</h1>
    <p>The iframe below is sandboxed with only allow-scripts.</p>
    <iframe
      sandbox="allow-scripts"
      src="./frame"
      title="Vega sandbox CSP spike frame"
      width="640"
      height="240"
    ></iframe>
  </body>
</html>`;

const renderFrameDocument = (nonce: string, payloadSrc: string) => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Vega sandbox CSP spike frame</title>
  </head>
  <body>
    <h1>Vega sandbox CSP spike frame</h1>
    <pre id="vega-sandbox-csp-spike-status">Loading standalone payload...</pre>
    <script nonce="${nonce}">
      const status = document.getElementById('vega-sandbox-csp-spike-status');
      const script = document.createElement('script');
      script.src = ${JSON.stringify(payloadSrc)};
      script.onload = () => {
        status.textContent = 'PASS: nonced bootstrap loaded the standalone payload.';
      };
      script.onerror = () => {
        status.textContent = 'FAIL: CSP blocked or failed to load the standalone payload.';
      };
      document.head.appendChild(script);
    </script>
  </body>
</html>`;

const renderPayloadScript = () => `
(() => {
  const marker = document.createElement('p');
  marker.id = 'vega-sandbox-csp-spike-payload';
  marker.textContent = 'Standalone payload script executed inside the sandbox frame.';
  document.body.appendChild(marker);
  window.parent.postMessage({ type: 'vegaSandboxCspSpikePayloadLoaded' }, '*');
})();
`;

export const registerSandboxCspSpikeRoutes = (core: CoreSetup): void => {
  const router = core.http.createRouter();
  const frameNonces = new Map<string, string>();
  const payloadSrc = core.http.staticAssets.prependPublicUrl(PAYLOAD_ROUTE_PATH);
  const payloadRoutePaths = [
    ...new Set([PAYLOAD_ROUTE_PATH, core.http.basePath.remove(getPathname(payloadSrc))]),
  ];

  core.http.registerOnPreResponse((request, response, toolkit) => {
    const nonce = frameNonces.get(request.uuid);

    if (request.route.path !== FRAME_ROUTE_PATH || !nonce) {
      return toolkit.next();
    }

    frameNonces.delete(request.uuid);

    return toolkit.next({
      headers: {
        'Content-Security-Policy': createFrameCsp(nonce),
      },
    });
  });

  router.get(
    {
      path: HOST_ROUTE_PATH,
      validate: false,
      options: PUBLIC_SPIKE_ROUTE_OPTIONS,
      security: SPIKE_ROUTE_SECURITY,
    },
    async (_context, _request, response) => {
      return response.ok({
        body: renderHostDocument(),
        headers: HTML_HEADERS,
      });
    }
  );

  router.get(
    {
      path: FRAME_ROUTE_PATH,
      validate: false,
      options: PUBLIC_SPIKE_ROUTE_OPTIONS,
      security: SPIKE_ROUTE_SECURITY,
    },
    async (context, request, response) => {
      const nonce = createNonce();
      frameNonces.set(request.uuid, nonce);

      return response.ok({
        body: renderFrameDocument(nonce, payloadSrc),
        headers: HTML_HEADERS,
      });
    }
  );

  for (const payloadRoutePath of payloadRoutePaths) {
    router.get(
      {
        path: payloadRoutePath,
        validate: false,
        options: PUBLIC_SPIKE_ROUTE_OPTIONS,
        security: SPIKE_ROUTE_SECURITY,
      },
      async (_context, _request, response) => {
        return response.ok({
          body: renderPayloadScript(),
          headers: SCRIPT_HEADERS,
        });
      }
    );
  }
};
