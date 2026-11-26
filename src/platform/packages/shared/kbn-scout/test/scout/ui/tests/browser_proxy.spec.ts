/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import http from 'http';
import { test as baseTest, expect, tags } from '../../../../src/playwright';
import { getBrowserEnvWithoutProxy } from '../../../../src/playwright/utils/browser_env';

// Chromium never proxies loopback names, so the site needs a name of its own.
const SITE_HOST = 'scout-proxy-check.test';
const SITE_BODY = 'answered by the site';
const PROXY_BODY = 'answered by the proxy';

type BrowserEnv = Record<string, string> | undefined;

interface ProxyCheck {
  proxyVars: Record<string, string>;
  scoutBrowserEnv: BrowserEnv;
  loadSite: (env: BrowserEnv) => Promise<string | undefined>;
}

const serve = (body: string): Promise<http.Server> =>
  new Promise((resolve, reject) => {
    const server = http.createServer((_request, response) => response.end(body));
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });

const getPort = (server: http.Server): number => {
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('Server is not listening on a TCP port');
  }
  return address.port;
};

const test = baseTest.extend<{ proxyCheck: ProxyCheck }>({
  proxyCheck: async ({ playwright }, use) => {
    const [site, proxy] = await Promise.all([serve(SITE_BODY), serve(PROXY_BODY)]);
    const proxyUrl = `http://127.0.0.1:${getPort(proxy)}`;
    const proxyVars = {
      HTTP_PROXY: proxyUrl,
      http_proxy: proxyUrl,
      HTTPS_PROXY: proxyUrl,
      https_proxy: proxyUrl,
    };

    await use({
      proxyVars,
      // What Scout gives the browser in a Citadel job that exports these variables.
      scoutBrowserEnv: getBrowserEnvWithoutProxy({
        ...process.env,
        ...proxyVars,
        USE_CITADEL_PROXY: 'true',
      }),
      loadSite: async (env) => {
        const browser = await playwright.chromium.launch({
          env,
          args: [`--host-resolver-rules=MAP ${SITE_HOST} 127.0.0.1`],
        });
        try {
          const page = await browser.newPage();
          const response = await page.goto(`http://${SITE_HOST}:${getPort(site)}/`);
          return await response?.text();
        } finally {
          await browser.close();
        }
      },
    });

    site.close();
    proxy.close();
  },
});

test.describe('Browser proxy environment', { tag: [...tags.stateful.classic] }, () => {
  test.skip(
    process.platform !== 'linux',
    'Chromium reads proxy environment variables only on Linux'
  );

  test('uses the proxy when the browser sees the proxy variables', async ({ proxyCheck }) => {
    const { proxyVars, scoutBrowserEnv, loadSite } = proxyCheck;

    expect(await loadSite({ ...scoutBrowserEnv, ...proxyVars })).toBe(PROXY_BODY);
  });

  test('connects directly with the environment Scout gives the browser', async ({ proxyCheck }) => {
    const { scoutBrowserEnv, loadSite } = proxyCheck;

    expect(await loadSite(scoutBrowserEnv)).toBe(SITE_BODY);
  });
});
