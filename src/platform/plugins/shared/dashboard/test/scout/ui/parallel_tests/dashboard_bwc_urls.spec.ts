/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { findImportedSavedObjectId } from '../../utils/migration_smoke_helpers';
import { BWC_SHORT_URLS_ARCHIVE } from '../constants';

const LOGS_SAMPLE_DATA_SET_ID = 'logs';
const LEGACY_DASHBOARD_ID = 'edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b';

spaceTest.describe('Dashboard bwc urls', { tag: tags.stateful.classic }, () => {
  // Scout imports create new copies with fresh ids, so resolve the short url ids by title.
  let importedShortUrls: Array<{ id: string; type: string; title: string }> = [];

  spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
    await apiServices.sampleData.install(LOGS_SAMPLE_DATA_SET_ID, scoutSpace.id);
    importedShortUrls = await scoutSpace.savedObjects.load(BWC_SHORT_URLS_ARCHIVE);
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  spaceTest.afterAll(async ({ apiServices, scoutSpace }) => {
    await apiServices.sampleData.remove(LOGS_SAMPLE_DATA_SET_ID, scoutSpace.id);
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'should forward legacy dashboard urls',
    async ({ page, kbnUrl, scoutSpace, pageObjects }) => {
      await page.goto(
        kbnUrl.get(`/s/${scoutSpace.id}/app/kibana#/dashboard/${LEGACY_DASHBOARD_ID}`)
      );
      await pageObjects.dashboard.waitForRenderComplete();
      await expect.poll(() => pageObjects.dashboard.getPanelCount()).toBe(12);
    }
  );

  const shortUrls = [
    // 8.14 before the Embeddable refactor
    { version: '8.14', id: 'url_to_8_14_dashboard' },
    // 8.18 after the embeddable refactor and before Serialized state only
    { version: '8.18', id: 'url_to_8_18_dashboard' },
    // 8.19 after the embeddable refactor and after Serialized state only
    { version: '8.19', id: 'url_to_8_19_dashboard' },
  ];

  for (const { version, id } of shortUrls) {
    spaceTest(
      `should load dashboard with ${version} short url state`,
      async ({ page, kbnUrl, scoutSpace, pageObjects }) => {
        const { controls, dashboard } = pageObjects;
        const shortUrlId = findImportedSavedObjectId(importedShortUrls, 'url', `/goto/${id}`);

        await page.goto(kbnUrl.get(`/s/${scoutSpace.id}/goto/${shortUrlId}`));
        await dashboard.waitForRenderComplete();

        await expect(controls.frames).toHaveCount(1);
        const controlId = await controls.getOnlyControlId();
        await expect.poll(() => controls.optionsList.getSelectionsString(controlId)).toBe('win 7');

        await expect.poll(() => dashboard.getPanelCount()).toBe(1);
        expect(await dashboard.getPanelTitles()).toStrictEqual(['Custom map']);

        await expect.poll(() => pageObjects.maps.getNumberOfLayers()).toBe(4);
      }
    );
  }
});
