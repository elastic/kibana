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
      'commits a staged counter selection on "Apply and close"',
      async ({ pageObjects }) => {
        const { gridSettings } = pageObjects.metricsExperience;

        await spaceTest.step('open the flyout with the apply button disabled', async () => {
          await gridSettings.open();
          await expect(gridSettings.applyButton).toBeDisabled();
        });

        await spaceTest.step('stage a counter aggregation selection', async () => {
          await gridSettings.selectCounterAggregation('max');
          await expect(gridSettings.applyButton).toBeEnabled();
          await expect(gridSettings.counterSelect).toContainText('Maximum');
        });

        await spaceTest.step('apply and close the flyout', async () => {
          await gridSettings.apply();
          await expect(gridSettings.flyout).toBeHidden();
        });

        await spaceTest.step('reopen and verify the selection committed', async () => {
          // Reopening (no reload) proves the value committed to in-memory state.
          await gridSettings.open();
          await expect(gridSettings.counterSelect).toContainText('Maximum');
        });
      }
    );

    spaceTest(
      'discards a staged gauge selection when "Cancel" is clicked',
      async ({ pageObjects }) => {
        const { gridSettings } = pageObjects.metricsExperience;

        await spaceTest.step('open the flyout with the default gauge selection', async () => {
          await gridSettings.open();
          await expect(gridSettings.gaugeSelect).toContainText('Average');
        });

        await spaceTest.step('stage a gauge aggregation selection', async () => {
          await gridSettings.selectGaugeAggregation('min');
          await expect(gridSettings.gaugeSelect).toContainText('Minimum');
        });

        await spaceTest.step('cancel the flyout', async () => {
          await gridSettings.cancel();
          await expect(gridSettings.flyout).toBeHidden();
        });

        await spaceTest.step('reopen and verify the selection was discarded', async () => {
          await gridSettings.open();
          await expect(gridSettings.gaugeSelect).toContainText('Average');
        });
      }
    );

    spaceTest(
      'persists an applied histogram percentile selection across a page reload',
      async ({ pageObjects, page }) => {
        const { gridSettings } = pageObjects.metricsExperience;

        await spaceTest.step('stage and apply a histogram percentile selection', async () => {
          await gridSettings.selectHistogramPercentile('p50');
          await expect(gridSettings.histogramSelect).toContainText('50th percentile');
          await gridSettings.apply();
          await expect(gridSettings.flyout).toBeHidden();
        });

        await spaceTest.step('wait for the setting to persist to local storage', async () => {
          // The applied setting is written to local storage via a throttled listener, so wait
          // for it to actually land there before reloading -- otherwise the reload can race
          // ahead of the write and read back the default instead of the applied value.
          await expect
            .poll(() => page.evaluate(() => window.localStorage.getItem('discover.tabs')))
            .toContain('"histogramPercentile":"p50"');
        });

        await spaceTest.step('reload the page', async () => {
          await page.reload();
          await expect(pageObjects.metricsExperience.grid).toBeVisible();
        });

        await spaceTest.step('reopen and verify the selection persisted', async () => {
          await gridSettings.open();
          await expect(gridSettings.histogramSelect).toContainText('50th percentile');
        });
      }
    );

    spaceTest(
      'applies counter, gauge and histogram aggregations end to end and persists them',
      async ({ pageObjects, page }) => {
        const { metricsExperience } = pageObjects;
        const { gridSettings, flyout } = metricsExperience;

        await spaceTest.step(
          'set counter, gauge and histogram aggregations and apply',
          async () => {
            await gridSettings.open();
            await gridSettings.selectCounterAggregation('max');
            await gridSettings.selectGaugeAggregation('min');
            await gridSettings.selectHistogramPercentile('p50');
            await gridSettings.apply();
            await expect(gridSettings.flyout).toBeHidden();
          }
        );

        await spaceTest.step('verify the counter aggregation is applied in the chart', async () => {
          await metricsExperience.searchMetric('counter_0');
          await metricsExperience.waitForFirstCard('counter_0-0');
          await metricsExperience.openInsightsFlyout(0);
          await flyout.esqlQuery.tabButton.click();
          await expect(flyout.esqlQuery.codeBlock).toContainText('MAX(RATE(counter_0))');
          await flyout.closeButton.click();
          await metricsExperience.clearSearch();
        });

        await spaceTest.step('verify the gauge aggregation is applied in the chart', async () => {
          await metricsExperience.searchMetric('gauge_0');
          await metricsExperience.waitForFirstCard('gauge_0-0');
          await metricsExperience.openInsightsFlyout(0);
          await flyout.esqlQuery.tabButton.click();
          await expect(flyout.esqlQuery.codeBlock).toContainText('MIN(gauge_0)');
          await flyout.closeButton.click();
          await metricsExperience.clearSearch();
        });

        await spaceTest.step(
          'verify the histogram aggregation is applied in the chart',
          async () => {
            await metricsExperience.searchMetric('histogram_0');
            await metricsExperience.waitForFirstCard('histogram_0-0');
            await metricsExperience.openInsightsFlyout(0);
            await flyout.esqlQuery.tabButton.click();
            await expect(flyout.esqlQuery.codeBlock).toContainText(
              'PERCENTILE(TO_TDIGEST(histogram_0), 50)'
            );
            await flyout.closeButton.click();
            await metricsExperience.clearSearch();
          }
        );

        await spaceTest.step('reload the page and verify the settings persisted', async () => {
          await page.reload();
          await expect(metricsExperience.grid).toBeVisible();

          await gridSettings.open();
          await expect(gridSettings.counterSelect).toContainText('Maximum');
          await expect(gridSettings.gaugeSelect).toContainText('Minimum');
          await expect(gridSettings.histogramSelect).toContainText('50th percentile');
          await gridSettings.cancel();
        });
      }
    );
  }
);
