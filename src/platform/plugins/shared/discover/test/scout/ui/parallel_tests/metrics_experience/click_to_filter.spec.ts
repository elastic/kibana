/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Click to filter tests.
 *
 * Validates that breaking down metrics by a dimension re-renders charts
 * with the selected dimension and the grid remains functional.
 */

import { expect } from '@kbn/scout/ui';
import {
  spaceTest,
  testData,
  DEFAULT_TIME_RANGE,
  DEFAULT_CONFIG,
} from '../../fixtures/metrics_experience';

const FIRST_DIMENSION = DEFAULT_CONFIG.dimensions[0].name;

spaceTest.describe(
  'Metrics in Discover - Click to Filter',
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
      'should apply breakdown dimension and re-render charts',
      async ({ pageObjects }) => {
        await pageObjects.discover.writeAndSubmitEsqlQuery(testData.ESQL_QUERIES.TS);
        const { metricsExperience } = pageObjects;
        await expect(metricsExperience.grid).toBeVisible();
        await expect(metricsExperience.getCardByIndex(0)).toBeVisible();

        await spaceTest.step('select a breakdown dimension', async () => {
          await metricsExperience.breakdownSelector.selectDimension(FIRST_DIMENSION);
          if (await metricsExperience.breakdownSelector.selectable.isVisible()) {
            await metricsExperience.breakdownSelector.toggleButton.click();
          }
          await expect(
            metricsExperience.breakdownSelector.getToggleWithSelection(FIRST_DIMENSION)
          ).toBeVisible();
          await pageObjects.discover.waitUntilSearchingHasFinished();
        });

        await spaceTest.step('charts should re-render with breakdown', async () => {
          await expect
            .poll(
              async () => {
                const card = metricsExperience.getCardByIndex(0);
                const loading = card.locator('[role="progressbar"]');
                return (await loading.count()) === 0;
              },
              { timeout: 30000 }
            )
            .toBe(true);
          await expect(metricsExperience.getCardByIndex(0)).toBeVisible();
        });

        await spaceTest.step('grid should remain visible with breakdown', async () => {
          await expect(metricsExperience.grid).toBeVisible();
          await expect(
            metricsExperience.breakdownSelector.getToggleWithSelection(FIRST_DIMENSION)
          ).toBeVisible();
        });
      }
    );
  }
);
