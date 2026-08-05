/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const deriveBasePath = (pathname: string): string => {
  const appIdx = pathname.indexOf('/app/');
  return appIdx >= 0 ? pathname.slice(0, appIdx) : '';
};

test.describe('Vega sandbox isolation', { tag: tags.stateful.classic }, () => {
  test('iframe cannot access parent document or observe cookies', async ({ browserAuth, page }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('home');

    // Ensure the parent page has an observable (non-HttpOnly) cookie.
    await page.evaluate(() => {
      document.cookie = 'kbnVegaSandboxTest=1; path=/';
    });
    await expect
      .poll(() => page.evaluate(() => document.cookie))
      .toMatch(/(?:^|;\s*)kbnVegaSandboxTest=1(?:;|$)/);

    const { origin, pathname } = new URL(page.url());
    const basePath = deriveBasePath(pathname);
    const frameSrc = `${origin}${basePath}/internal/vis_type_vega/sandbox`;

    await page.evaluate((src) => {
      const container = document.createElement('div');
      container.style.position = 'relative';
      container.style.width = '400px';
      container.style.height = '300px';

      const iframe = document.createElement('iframe');
      iframe.setAttribute('sandbox', 'allow-scripts');
      iframe.setAttribute('title', 'Vega sandbox');
      iframe.style.position = 'absolute';
      iframe.style.inset = '0';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = '0';
      iframe.src = src;

      container.appendChild(iframe);
      document.body.appendChild(container);
    }, frameSrc);

    const iframeHandle = await page.locator('iframe[title="Vega sandbox"]').elementHandle();
    expect(iframeHandle).not.toBeNull();

    const frame = await iframeHandle!.contentFrame();
    expect(frame).not.toBeNull();

    const result = await frame!.evaluate(() => {
      const canReadParentDocument = (() => {
        try {
          // Accessing parent document should throw a SecurityError for an opaque-origin sandbox.
          // eslint-disable-next-line no-unused-expressions
          window.parent.document;
          return true;
        } catch {
          return false;
        }
      })();

      return {
        canReadParentDocument,
        cookie: document.cookie,
        origin: window.location.origin,
      };
    });

    expect(result.origin).toBe('null');
    expect(result.canReadParentDocument).toBe(false);
    expect(result.cookie).toBe('');
  });
});

