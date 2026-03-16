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
 * Validates that clicking on a chart data point after selecting a breakdown
 * dimension appends a WHERE clause to the ES|QL query with the corresponding
 * dimension value.
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
      'should append WHERE clause when clicking a chart data point',
      async ({ pageObjects }) => {
        await pageObjects.discover.writeAndSubmitEsqlQuery(testData.ESQL_QUERIES.TS);
        const { metricsExperience, discover } = pageObjects;
        await expect(metricsExperience.grid).toBeVisible();
        await expect(metricsExperience.getCardByIndex(0)).toBeVisible();

        await spaceTest.step('select a breakdown dimension', async () => {
          await metricsExperience.breakdownSelector.selectDimension(FIRST_DIMENSION);
          await expect(
            metricsExperience.breakdownSelector.getToggleWithSelection(FIRST_DIMENSION)
          ).toBeVisible();
          await discover.waitUntilSearchingHasFinished();
        });

        await spaceTest.step('wait for chart to render with breakdown', async () => {
          await metricsExperience.waitForCardRenderComplete(0);
        });

        const queryBefore = await discover.getEsqlQueryValue();

        await spaceTest.step('click a chart data point to trigger filter', async () => {
          await metricsExperience.clickChartDataPoint(0);
          await discover.waitUntilSearchingHasFinished();
        });

        await spaceTest.step('ES|QL query should contain a WHERE clause', async () => {
          const queryAfter = await discover.getEsqlQueryValue();
          expect(queryAfter).not.toStrictEqual(queryBefore);
          expect(queryAfter.toUpperCase()).toContain('WHERE');
        });

        await spaceTest.step('chart should re-render with the filtered query', async () => {
          await metricsExperience.waitForCardRenderComplete(0);
          await expect(metricsExperience.getCardByIndex(0)).toBeVisible();
        });
      }
    );
  }
);
