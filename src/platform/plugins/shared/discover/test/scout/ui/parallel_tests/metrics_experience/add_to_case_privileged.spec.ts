/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData, DEFAULT_TIME_RANGE } from '../../fixtures/metrics_experience';

spaceTest.describe(
  'Metrics in Discover - Add to Case',
  {
    tag: testData.METRICS_EXPERIENCE_TAGS,
  },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.load(testData.KBN_ARCHIVE);
      await scoutSpace.uiSettings.setDefaultIndex(testData.DATA_VIEW_NAME);
      await scoutSpace.uiSettings.setDefaultTime(DEFAULT_TIME_RANGE);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      // "Add to case" action requires cases 'create' and 'update' capabilities (viewer lacks both)
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.discover.goto();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'should show Add to case action in chart context menu',
      async ({ pageObjects, page }) => {
        await pageObjects.discover.writeAndSubmitEsqlQuery(testData.ESQL_QUERIES.TS);
        const { metricsExperience } = pageObjects;
        await expect(metricsExperience.grid).toBeVisible();

        const cardIndex = 0;

        await spaceTest.step('open chart context menu', async () => {
          await metricsExperience.openCardContextMenu(cardIndex);
        });

        await spaceTest.step('verify Add to case action is visible', async () => {
          await expect(metricsExperience.chartActions.addToCase).toBeVisible();
        });

        await spaceTest.step('click Add to case action', async () => {
          await metricsExperience.chartActions.addToCase.click();
        });

        await spaceTest.step('verify case selector modal opens', async () => {
          const caseModal = page.testSubj.locator('all-cases-modal');
          await expect(caseModal).toBeVisible();
        });

        await spaceTest.step('close case selector modal', async () => {
          await page.keyboard.press('Escape');
        });
      }
    );
  }
);
