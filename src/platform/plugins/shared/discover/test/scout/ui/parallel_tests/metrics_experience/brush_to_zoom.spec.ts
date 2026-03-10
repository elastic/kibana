/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Brush to zoom tests.
 *
 * Validates that click-and-drag (brush) on a chart in the metrics grid
 * narrows the time range and updates all visible charts.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData, DEFAULT_TIME_RANGE } from '../../fixtures/metrics_experience';

spaceTest.describe(
  'Metrics in Discover - Brush to Zoom',
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
      'should narrow time range when brushing a chart in the grid',
      async ({ pageObjects }) => {
        await pageObjects.discover.writeAndSubmitEsqlQuery(testData.ESQL_QUERIES.TS);
        const { metricsExperience } = pageObjects;
        await expect(metricsExperience.grid).toBeVisible();
        await expect(metricsExperience.getCardByIndex(0)).toBeVisible();

        const timeConfigBefore = await pageObjects.datePicker.getTimeConfig();

        await spaceTest.step('brush the first chart card', async () => {
          await metricsExperience.brushChartInCard(0);
          await pageObjects.discover.waitUntilSearchingHasFinished();
        });

        await spaceTest.step('time range should have narrowed', async () => {
          await expect
            .poll(async () => {
              const timeConfigAfter = await pageObjects.datePicker.getTimeConfig();
              return (
                timeConfigAfter.start !== timeConfigBefore.start ||
                timeConfigAfter.end !== timeConfigBefore.end
              );
            })
            .toBe(true);
        });

        await spaceTest.step('grid should still be visible after zoom', async () => {
          await expect(metricsExperience.grid).toBeVisible();
          await expect(metricsExperience.getCardByIndex(0)).toBeVisible();
        });
      }
    );
  }
);
