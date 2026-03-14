/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Save session tests.
 *
 * Validates that a configured metrics view can be saved, cleared, and then
 * reloaded from saved searches with full state restoration.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData, DEFAULT_TIME_RANGE } from '../../fixtures/metrics_experience';

const SAVED_SEARCH_NAME = 'Metrics Tier 3 Save Test';

spaceTest.describe(
  'Metrics in Discover - Save Session',
  { tag: testData.METRICS_EXPERIENCE_TAGS },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.load(testData.KBN_ARCHIVE);
      await scoutSpace.uiSettings.setDefaultIndex(testData.DATA_VIEW_NAME);
      await scoutSpace.uiSettings.setDefaultTime(DEFAULT_TIME_RANGE);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.discover.goto();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest('should save and restore a metrics session', async ({ pageObjects, page }) => {
      const { metricsExperience, discover } = pageObjects;

      await discover.writeAndSubmitEsqlQuery(testData.ESQL_QUERIES.TS);
      await expect(metricsExperience.grid).toBeVisible();
      await expect(metricsExperience.getCardByIndex(0)).toBeVisible();

      await spaceTest.step('save the current metrics session', async () => {
        await discover.saveSearch(SAVED_SEARCH_NAME);
      });

      await spaceTest.step('start a new Discover session', async () => {
        const newButton = page.testSubj.locator('discoverNewButton');
        await newButton.click();
        await expect(metricsExperience.grid).toBeHidden({ timeout: 30000 });
      });

      await spaceTest.step('load the saved search', async () => {
        await discover.loadSavedSearch(SAVED_SEARCH_NAME);
      });

      await spaceTest.step('metrics grid should be restored', async () => {
        await expect(metricsExperience.grid).toBeVisible();
        await expect(metricsExperience.getCardByIndex(0)).toBeVisible();
      });
    });
  }
);
