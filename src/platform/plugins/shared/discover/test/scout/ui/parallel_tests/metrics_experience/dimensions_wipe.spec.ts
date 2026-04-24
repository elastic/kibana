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
  'Metrics in Discover - Dimensions wipe on stream switch',
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
      await browserAuth.loginAsViewer();
      await pageObjects.discover.goto();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'drops a selected dimension when switching to a stream that does not emit it, and keeps the chart rendered',
      async ({ pageObjects, page }) => {
        const { discover, metricsExperience } = pageObjects;
        const { ONLY_IN_A } = testData.METRICS_DIMENSION_FIELDS;

        await spaceTest.step('select a dimension on the first stream', async () => {
          await discover.writeAndSubmitEsqlQuery(testData.ESQL_QUERIES.TS);
          await expect(metricsExperience.grid).toBeVisible();
          await expect(metricsExperience.getCardByIndex(0)).toBeVisible();
          await metricsExperience.breakdownSelector.selectDimension(ONLY_IN_A);
          await expect(
            metricsExperience.breakdownSelector.getToggleWithSelection(ONLY_IN_A)
          ).toBeVisible();
          await discover.waitUntilSearchingHasFinished();
          await expect(metricsExperience.getCardByIndex(0)).toBeVisible();
        });

        await spaceTest.step('switch to a stream that does not emit it', async () => {
          await discover.codeEditor.setCodeEditorValue(testData.ESQL_QUERIES.TS_OTHER);
          await page.testSubj.click('querySubmitButton');
          await discover.waitUntilSearchingHasFinished();
          await expect(metricsExperience.grid).toBeVisible();
          await expect(metricsExperience.getCardByIndex(0)).toBeVisible();
          await expect(
            metricsExperience.breakdownSelector.getToggleWithSelection(ONLY_IN_A)
          ).toBeHidden();
        });

        await spaceTest.step('switch back to the first stream', async () => {
          await discover.codeEditor.setCodeEditorValue(testData.ESQL_QUERIES.TS);
          await page.testSubj.click('querySubmitButton');
          await discover.waitUntilSearchingHasFinished();
          await expect(metricsExperience.grid).toBeVisible();
          await expect(metricsExperience.getCardByIndex(0)).toBeVisible();
          await expect(
            metricsExperience.breakdownSelector.getToggleWithSelection(ONLY_IN_A)
          ).toBeHidden();
        });
      }
    );
  }
);
