/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Share session tests.
 *
 * Validates that a configured metrics view (query, time range) can be shared
 * via URL and that another user opening that URL sees the same metrics grid.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData, DEFAULT_TIME_RANGE } from '../../fixtures/metrics_experience';

spaceTest.describe(
  'Metrics in Discover - Share Session',
  { tag: testData.METRICS_EXPERIENCE_TAGS },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.load(testData.KBN_ARCHIVE);
      await scoutSpace.uiSettings.setDefaultIndex(testData.DATA_VIEW_NAME);
      await scoutSpace.uiSettings.setDefaultTime(DEFAULT_TIME_RANGE);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.discover.goto();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'should preserve metrics view state through a shared URL',
      async ({ pageObjects, page }) => {
        const { metricsExperience, discover } = pageObjects;

        await discover.writeAndSubmitEsqlQuery(testData.ESQL_QUERIES.TS);
        await expect(metricsExperience.grid).toBeVisible();
        await expect(metricsExperience.getCardByIndex(0)).toBeVisible();

        let sharedUrl: string;

        await spaceTest.step('open share modal and copy the URL', async () => {
          await metricsExperience.share.openShareModal();
          sharedUrl = await metricsExperience.share.getSharedUrl();
          expect(sharedUrl).toBeTruthy();
          await metricsExperience.share.closeShareModal();
        });

        await spaceTest.step('navigate to shared URL', async () => {
          await page.goto(sharedUrl!);
          await discover.waitUntilSearchingHasFinished();
        });

        await spaceTest.step('metrics grid should be visible at shared URL', async () => {
          await expect(metricsExperience.grid).toBeVisible();
          await expect(metricsExperience.getCardByIndex(0)).toBeVisible();
        });
      }
    );
  }
);
