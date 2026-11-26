/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import http from 'http';
import { createPlaywrightConfig, test as baseTest, expect, tags } from '../../../../src/playwright';

// Chromium never proxies loopback names, so the site needs a name of its own.
const SITE_HOST = 'scout-proxy-check.test';
const SITE_BODY = 'answered by the site';
const PROXY_BODY = 'answered by the proxy';

type ScoutUseOptions = NonNullable<ReturnType<typeof createPlaywrightConfig>['use']>;
type LoadSite = (launchOptions?: ScoutUseOptions['launchOptions']) => Promise<string | undefined>;

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

const test = baseTest.extend<{ loadSite: LoadSite }>({
  loadSite: async ({ playwright }, use) => {
    const [site, proxy] = await Promise.all([serve(SITE_BODY), serve(PROXY_BODY)]);
    const proxyUrl = `http://127.0.0.1:${getPort(proxy)}`;
    // What a Citadel job exports. The test runs with these set, like a real job.
    const jobEnv: Record<string, string> = {
      USE_CITADEL_PROXY: 'true',
      HTTP_PROXY: proxyUrl,
      http_proxy: proxyUrl,
      HTTPS_PROXY: proxyUrl,
      https_proxy: proxyUrl,
    };
    const originalEnv = Object.keys(jobEnv).map((name) => [name, process.env[name]] as const);
    Object.assign(process.env, jobEnv);

    await use(async (launchOptions = {}) => {
      const browser = await playwright.chromium.launch({
        ...launchOptions,
        args: [...(launchOptions.args ?? []), `--host-resolver-rules=MAP ${SITE_HOST} 127.0.0.1`],
      });
      try {
        const page = await browser.newPage();
        const response = await page.goto(`http://${SITE_HOST}:${getPort(site)}/`);
        return await response?.text();
      } finally {
        await browser.close();
      }
    });

    for (const [name, value] of originalEnv) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
    site.close();
    proxy.close();
  },
});

test.describe('Browser proxy environment', { tag: [...tags.stateful.classic] }, () => {
  test.skip(
    process.platform !== 'linux',
    'Chromium reads proxy environment variables only on Linux'
  );

  test('uses the proxy when launched without the Scout launch options', async ({ loadSite }) => {
    expect(await loadSite()).toBe(PROXY_BODY);
  });

  test('connects directly when launched with the Scout launch options', async ({ loadSite }) => {
    const { launchOptions } = createPlaywrightConfig({ testDir: '.' }).use ?? {};

    expect(await loadSite(launchOptions)).toBe(SITE_BODY);
  });
});
