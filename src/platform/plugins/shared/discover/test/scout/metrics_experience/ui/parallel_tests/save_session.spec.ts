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
 * Validates that a configured metrics view can be saved, reloaded, and
 * restored after unsaved metrics-specific changes.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData, DEFAULT_TIME_RANGE, DEFAULT_CONFIG } from '../fixtures';

const SAVED_SEARCH_NAME = 'Metrics Tier 3 Save Test';
const FIRST_DIMENSION = DEFAULT_CONFIG.dimensions[0].name;
const SECOND_DIMENSION = DEFAULT_CONFIG.dimensions[1].name;

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
      await pageObjects.discover.goto({ queryMode: 'esql' });
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest('should save and restore a metrics session', async ({ pageObjects }) => {
      const { metricsExperience, discover } = pageObjects;

      await discover.writeAndSubmitEsqlQuery(testData.ESQL_QUERIES.TS);
      await expect(metricsExperience.grid).toBeVisible();
      await expect(metricsExperience.getCardByIndex(0)).toBeVisible();

      await spaceTest.step('select two breakdown dimensions', async () => {
        await metricsExperience.breakdownSelector.selectDimension(FIRST_DIMENSION);
        await metricsExperience.breakdownSelector.selectDimension(SECOND_DIMENSION);
        await expect(
          metricsExperience.breakdownSelector.getToggleWithSelection(FIRST_DIMENSION)
        ).toBeVisible();
        await expect(
          metricsExperience.breakdownSelector.getToggleWithSelection(SECOND_DIMENSION)
        ).toBeVisible();
        await discover.waitUntilSearchingHasFinished();
      });

      const cardCountBefore = await metricsExperience.getVisibleCardCount();
      const queryBefore = await discover.getEsqlQueryValue();

      await spaceTest.step('save the current metrics session', async () => {
        await discover.saveSearch(SAVED_SEARCH_NAME);
      });

      await spaceTest.step('start a new Discover session', async () => {
        await discover.clickNewSearch();
        await expect(
          metricsExperience.breakdownSelector.getToggleWithSelection(FIRST_DIMENSION)
        ).toBeHidden();
      });

      await spaceTest.step('load the saved search', async () => {
        await discover.loadSavedSearch(SAVED_SEARCH_NAME);
      });

      await spaceTest.step('metrics grid should be restored', async () => {
        await expect(metricsExperience.grid).toBeVisible();
        await expect(metricsExperience.getCardByIndex(0)).toBeVisible();
      });

      await spaceTest.step('breakdown selections should be preserved', async () => {
        await expect(
          metricsExperience.breakdownSelector.getToggleWithSelection(FIRST_DIMENSION)
        ).toBeVisible();
        await expect(
          metricsExperience.breakdownSelector.getToggleWithSelection(SECOND_DIMENSION)
        ).toBeVisible();
      });

      await spaceTest.step('card count should match the original session', async () => {
        const cardCountAfter = await metricsExperience.getVisibleCardCount();
        expect(cardCountAfter).toStrictEqual(cardCountBefore);
      });

      await spaceTest.step('ES|QL query should be preserved', async () => {
        const queryAfter = await discover.getEsqlQueryValue();
        expect(queryAfter).toStrictEqual(queryBefore);
      });

      await spaceTest.step('remove a saved breakdown selection', async () => {
        await metricsExperience.breakdownSelector.selectDimension(SECOND_DIMENSION);
        await expect(
          metricsExperience.breakdownSelector.getToggleWithSelection(SECOND_DIMENSION)
        ).toBeHidden();
        await expect(discover.unsavedChangesIndicator()).toBeVisible();
      });

      await spaceTest.step('revert to the saved breakdown selection', async () => {
        await discover.revertUnsavedChanges();
        await expect(
          metricsExperience.breakdownSelector.getToggleWithSelection(FIRST_DIMENSION)
        ).toBeVisible();
        await expect(
          metricsExperience.breakdownSelector.getToggleWithSelection(SECOND_DIMENSION)
        ).toBeVisible();
        await expect(discover.unsavedChangesIndicator()).toBeHidden();
      });
    });
  }
);
