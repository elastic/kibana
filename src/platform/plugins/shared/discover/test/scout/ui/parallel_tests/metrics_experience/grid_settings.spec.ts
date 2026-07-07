/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Grid settings tests.
 *
 * These tests validate that the toolbar edit button opens the grid
 * settings flyout, that selections are only staged (not applied) until
 * "Apply and close" is clicked, that "Cancel" discards a staged selection,
 * and that an applied selection persists across a page reload via
 * Discover's persistent profile state.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData, DEFAULT_TIME_RANGE } from '../../fixtures/metrics_experience';

spaceTest.describe(
  'Metrics in Discover - Grid Settings',
  { tag: testData.METRICS_EXPERIENCE_TAGS },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.load(testData.KBN_ARCHIVE);
      await scoutSpace.uiSettings.setDefaultIndex(testData.DATA_VIEW_NAME);
      await scoutSpace.uiSettings.setDefaultTime(DEFAULT_TIME_RANGE);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.discover.goto({ queryMode: 'esql' });
      await pageObjects.discover.writeAndSubmitEsqlQuery(testData.ESQL_QUERIES.TS);
      await expect(pageObjects.metricsExperience.grid).toBeVisible();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'stages a counter selection without applying it until "Apply and close" is clicked',
      async ({ pageObjects }) => {
        const { gridSettings } = pageObjects.metricsExperience;

        await spaceTest.step('open the flyout via the edit button', async () => {
          await gridSettings.open();
          await expect(gridSettings.flyout).toBeVisible();
        });

        await spaceTest.step(
          '"Apply and close" starts disabled with no pending changes',
          async () => {
            await expect(gridSettings.applyButton).toBeDisabled();
          }
        );

        await spaceTest.step(
          'selecting MAX for counters enables "Apply and close" but does not change the dropdown label yet',
          async () => {
            await gridSettings.selectCounterAggregation('max');
            await expect(gridSettings.applyButton).toBeEnabled();
            await expect(gridSettings.counterSelect).toContainText('Maximum');
          }
        );

        await spaceTest.step('applying commits the change and closes the flyout', async () => {
          await gridSettings.apply();
          await expect(gridSettings.flyout).toBeHidden();
        });

        await spaceTest.step('reopening the flyout still shows the applied value', async () => {
          await gridSettings.open();
          await expect(gridSettings.counterSelect).toContainText('Maximum');
        });
      }
    );

    spaceTest(
      'discards a staged gauge selection when "Cancel" is clicked',
      async ({ pageObjects }) => {
        const { gridSettings } = pageObjects.metricsExperience;

        await spaceTest.step('open the flyout and note the current gauge value', async () => {
          await gridSettings.open();
          await expect(gridSettings.gaugeSelect).toContainText('Average');
        });

        await spaceTest.step('select MINIMUM for gauges without applying', async () => {
          await gridSettings.selectGaugeAggregation('min');
          await expect(gridSettings.gaugeSelect).toContainText('Minimum');
        });

        await spaceTest.step('cancel discards the staged change and closes', async () => {
          await gridSettings.cancel();
          await expect(gridSettings.flyout).toBeHidden();
        });

        await spaceTest.step('reopening the flyout still shows the original value', async () => {
          await gridSettings.open();
          await expect(gridSettings.gaugeSelect).toContainText('Average');
        });
      }
    );

    spaceTest(
      'persists an applied histogram percentile selection across a page reload',
      async ({ pageObjects, page }) => {
        const { gridSettings } = pageObjects.metricsExperience;

        await spaceTest.step(
          'select and apply the 50th percentile for the histogram aggregation',
          async () => {
            await gridSettings.selectHistogramPercentile('p50');
            await expect(gridSettings.histogramSelect).toContainText('50th percentile');
            await gridSettings.apply();
            await expect(gridSettings.flyout).toBeHidden();
          }
        );

        await spaceTest.step('reload the page', async () => {
          await page.reload();
          await expect(pageObjects.metricsExperience.grid).toBeVisible();
        });

        await spaceTest.step('reopening the flyout still shows the applied value', async () => {
          await gridSettings.open();
          await expect(gridSettings.histogramSelect).toContainText('50th percentile');
        });
      }
    );
  }
);
