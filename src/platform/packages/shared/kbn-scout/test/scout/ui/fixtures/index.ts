/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import http from 'http';
import net from 'net';
import type { createPlaywrightConfig } from '../../../../src/playwright';
import { test as baseTest } from '../../../../src/playwright';
import { getEnv, listen, setEnv } from './helpers';

// Chromium never proxies loopback names, so the site needs a name of its own.
const SITE_HOST = 'scout-proxy-check.test';

type Scheme = 'http' | 'https';
type Reached = Record<Scheme, Set<'site' | 'proxy'>>;
type ScoutUseOptions = NonNullable<ReturnType<typeof createPlaywrightConfig>['use']>;

interface ProxyFixtures {
  /** A local site and a stand-in proxy, with the proxy variables a Citadel job exports. */
  citadelJob: { siteUrls: Record<Scheme, string>; reached: Reached; env: Record<string, string> };
  /** Visits the site in a browser launched with the given options and returns what each visit reached. */
  visitSite: (launchOptions?: ScoutUseOptions['launchOptions']) => Promise<Record<Scheme, string>>;
}

export const test = baseTest.extend<ProxyFixtures>({
  citadelJob: async ({}, use) => {
    const reached: Reached = { http: new Set(), https: new Set() };

    const site = await listen(
      http.createServer((_request, response) => {
        reached.http.add('site');
        response.end();
      })
    );
    // No TLS here: a connection is enough to show the browser came directly.
    const secureSite = await listen(
      net.createServer((socket) => {
        reached.https.add('site');
        socket.destroy();
      })
    );
    const siteUrls = {
      http: `http://${SITE_HOST}:${site.port}/`,
      https: `https://${SITE_HOST}:${secureSite.port}/`,
    };
    // Only requests for the site count, so other traffic can't pass for a visit.
    const proxy = await listen(
      http
        .createServer((request, response) => {
          if (request.url === siteUrls.http) {
            reached.http.add('proxy');
          }
          response.end();
        })
        .on('connect', (request, socket) => {
          if (request.url === new URL(siteUrls.https).host) {
            reached.https.add('proxy');
          }
          socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');
        })
    );

    const proxyUrl = `http://127.0.0.1:${proxy.port}`;
    const restoreEnv = setEnv({
      USE_CITADEL_PROXY: 'true',
      HTTP_PROXY: proxyUrl,
      http_proxy: proxyUrl,
      HTTPS_PROXY: proxyUrl,
      https_proxy: proxyUrl,
      NO_PROXY: 'localhost,127.0.0.1',
      no_proxy: 'localhost,127.0.0.1',
    });

    await use({ siteUrls, reached, env: getEnv() });

    restoreEnv();
    site.close();
    secureSite.close();
    proxy.close();
  },

  visitSite: async ({ playwright, citadelJob }, use) => {
    const { siteUrls, reached, env } = citadelJob;

    await use(async (launchOptions = {}) => {
      const browser = await playwright.chromium.launch({
        ...launchOptions,
        // Set explicitly: Playwright would otherwise fill it in from this run's own config.
        env: launchOptions.env ?? env,
        args: [...(launchOptions.args ?? []), `--host-resolver-rules=MAP ${SITE_HOST} 127.0.0.1`],
      });
      try {
        const page = await browser.newPage();
        await page.goto(siteUrls.http);
        // This visit always fails, as nothing here speaks TLS. What it reached is what counts.
        await page.goto(siteUrls.https).catch(() => undefined);
      } finally {
        await browser.close();
      }
      return {
        http: [...reached.http].sort().join('+'),
        https: [...reached.https].sort().join('+'),
      };
    });
  },
});
