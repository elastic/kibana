/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { createPlaywrightConfig } from '../../../../src/playwright';
import { test as baseTest } from '../../../../src/playwright';
import { getPort, serve, setEnv } from './helpers';

// Chromium never proxies loopback names, so the site needs a name of its own.
const SITE_HOST = 'scout-proxy-check.test';

type ScoutUseOptions = NonNullable<ReturnType<typeof createPlaywrightConfig>['use']>;

interface ProxyFixtures {
  /** A local site and a stand-in proxy, with the proxy variables a Citadel job exports. */
  citadelJob: { siteUrl: string };
  /** Opens the site in a browser launched with the given options and returns who answered. */
  loadSite: (launchOptions?: ScoutUseOptions['launchOptions']) => Promise<string | undefined>;
}

export const test = baseTest.extend<ProxyFixtures>({
  citadelJob: async ({}, use) => {
    const [site, proxy] = await Promise.all([serve('site'), serve('proxy')]);
    const proxyUrl = `http://127.0.0.1:${getPort(proxy)}`;
    const restoreEnv = setEnv({
      USE_CITADEL_PROXY: 'true',
      HTTP_PROXY: proxyUrl,
      http_proxy: proxyUrl,
      HTTPS_PROXY: proxyUrl,
      https_proxy: proxyUrl,
    });

    await use({ siteUrl: `http://${SITE_HOST}:${getPort(site)}/` });

    restoreEnv();
    site.close();
    proxy.close();
  },

  loadSite: async ({ playwright, citadelJob }, use) => {
    await use(async (launchOptions = {}) => {
      const browser = await playwright.chromium.launch({
        ...launchOptions,
        args: [...(launchOptions.args ?? []), `--host-resolver-rules=MAP ${SITE_HOST} 127.0.0.1`],
      });
      try {
        const page = await browser.newPage();
        const response = await page.goto(citadelJob.siteUrl);
        return await response?.text();
      } finally {
        await browser.close();
      }
    });
  },
});
