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
import type { IExternalUrlPolicy } from '@kbn/core-http-common';
import { VEGA_SANDBOX_BUNDLE_FILE, VEGA_SANDBOX_BUNDLE_PUBLIC_PATH } from '@kbn/vega-sandbox';
import { VEGA_SANDBOX_ROUTE_PATH } from '../common/constants';

const HTML_HEADERS = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'no-store',
} as const;

const ROUTE_OPTIONS = {
  access: 'public',
} as const;

const ROUTE_SECURITY = {
  authz: {
    enabled: false,
    reason: 'The Vega sandbox route serves a static HTML document and does not access user data.',
  },
} as const;

const createNonce = () => randomBytes(16).toString('base64');

const normalizeProtocol = (protocol: string): string =>
  protocol.endsWith(':') ? protocol.toLowerCase() : `${protocol.toLowerCase()}:`;

const normalizeHost = (host: string): string => host.replace(/\.$/, '').toLowerCase();

const getHostSources = (host: string, protocol?: string): string[] => {
  const normalizedHost = normalizeHost(host);
  const wildcardHost = normalizedHost.includes(':') ? normalizedHost : `*.${normalizedHost}`;

  if (protocol) {
    const normalizedProtocol = normalizeProtocol(protocol);
    return [`${normalizedProtocol}//${normalizedHost}`, `${normalizedProtocol}//${wildcardHost}`];
  }

  return [normalizedHost, wildcardHost];
};

export const getImgSrcSourcesFromPolicy = (
  policy: readonly IExternalUrlPolicy[],
  kibanaOrigin?: string
): string[] => {
  const hasDenyRule = policy.some(({ allow }) => !allow);
  const sources = new Set<string>();

  if (kibanaOrigin) {
    sources.add(kibanaOrigin);
  }

  for (const rule of policy) {
    if (!rule.allow) {
      continue;
    }

    if (rule.host) {
      for (const source of getHostSources(rule.host, rule.protocol)) {
        sources.add(source);
      }
      continue;
    }

    if (rule.protocol) {
      if (!hasDenyRule) {
        sources.add(normalizeProtocol(rule.protocol));
      }
      continue;
    }

    if (!hasDenyRule) {
      sources.add('*');
    }
  }

  return [...sources];
};

export const createSandboxCsp = ({
  imgSrcSources,
  nonce,
}: {
  imgSrcSources: readonly string[];
  nonce: string;
}): string => {
  const imgSrc = imgSrcSources.length ? imgSrcSources.join(' ') : "'none'";

  return [
    "default-src 'none'",
    `script-src 'nonce-${nonce}' 'strict-dynamic'`,
    `img-src ${imgSrc}`,
    "style-src 'unsafe-inline'",
  ].join('; ');
};

const renderSandboxDocument = (nonce: string, bundleSrc: string) => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Vega sandbox</title>
    <style>
      html,
      body,
      #vega-sandbox-root {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        background: transparent;
      }
      body {
        overflow: hidden;
      }
      #vega-sandbox-root {
        display: flex;
        flex-direction: column;
        min-width: 0;
        min-height: 0;
      }
    </style>
  </head>
  <body>
    <div id="vega-sandbox-root"></div>
    <script nonce="${nonce}">
      const script = document.createElement('script');
      script.src = ${JSON.stringify(bundleSrc)};
      document.head.appendChild(script);
    </script>
  </body>
</html>`;

export const registerSandboxRoute = (core: CoreSetup): void => {
  const router = core.http.createRouter();
  const responseCspByRequestId = new Map<string, string>();
  const bundleSrc = core.http.staticAssets.prependPublicUrl(
    `${VEGA_SANDBOX_BUNDLE_PUBLIC_PATH}${VEGA_SANDBOX_BUNDLE_FILE}`
  );

  core.http.registerOnPreResponse((request, response, toolkit) => {
    const csp = responseCspByRequestId.get(request.uuid);

    if (request.route.path !== VEGA_SANDBOX_ROUTE_PATH || !csp) {
      return toolkit.next();
    }

    responseCspByRequestId.delete(request.uuid);

    return toolkit.next({
      headers: {
        'Content-Security-Policy': csp,
      },
    });
  });

  router.get(
    {
      path: VEGA_SANDBOX_ROUTE_PATH,
      validate: false,
      options: ROUTE_OPTIONS,
      security: ROUTE_SECURITY,
    },
    async (_context, request, response) => {
      const nonce = createNonce();
      const kibanaOrigin =
        core.http.basePath.publicBaseUrl != null
          ? new URL(core.http.basePath.publicBaseUrl).origin
          : request.url.origin;
      const imgSrcSources = getImgSrcSourcesFromPolicy(core.http.externalUrl.policy, kibanaOrigin);

      responseCspByRequestId.set(request.uuid, createSandboxCsp({ imgSrcSources, nonce }));

      return response.ok({
        body: renderSandboxDocument(nonce, bundleSrc),
        headers: HTML_HEADERS,
      });
    }
  );
};
