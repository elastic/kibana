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
import { BWC_SHORT_URLS_ARCHIVE, LEGACY_DASHBOARD_ID } from '../constants';

test.describe('Dashboard bwc urls', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ kbnClient }) => {
    // Sample data is installed in global setup. Short urls keep the ids from the archive.
    await kbnClient.importExport.load(BWC_SHORT_URLS_ARCHIVE);
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.importExport.unload(BWC_SHORT_URLS_ARCHIVE);
  });

  test('should forward legacy dashboard urls', async ({ page, kbnUrl, pageObjects }) => {
    await page.goto(kbnUrl.get(`/app/kibana#/dashboard/${LEGACY_DASHBOARD_ID}`));
    await pageObjects.dashboard.waitForRenderComplete();
    await expect.poll(() => pageObjects.dashboard.getPanelCount()).toBe(12);
  });

  const shortUrls = [
    // 8.14 before the Embeddable refactor
    { version: '8.14', id: 'url_to_8_14_dashboard' },
    // 8.18 after the embeddable refactor and before Serialized state only
    { version: '8.18', id: 'url_to_8_18_dashboard' },
    // 8.19 after the embeddable refactor and after Serialized state only
    { version: '8.19', id: 'url_to_8_19_dashboard' },
  ];

  for (const { version, id } of shortUrls) {
    test(`should load dashboard with ${version} short url state`, async ({
      page,
      kbnUrl,
      pageObjects,
    }) => {
      const { controls, dashboard } = pageObjects;

      await page.goto(kbnUrl.get(`/goto/${id}`));
      await dashboard.waitForRenderComplete();

      await expect(controls.frames).toHaveCount(1);
      const controlId = await controls.getOnlyControlId();
      await expect.poll(() => controls.optionsList.getSelectionsString(controlId)).toBe('win 7');

      await expect.poll(() => dashboard.getPanelCount()).toBe(1);
      expect(await dashboard.getPanelTitles()).toStrictEqual(['Custom map']);

      await expect.poll(() => pageObjects.maps.getNumberOfLayers()).toBe(4);
    });
  }
});
