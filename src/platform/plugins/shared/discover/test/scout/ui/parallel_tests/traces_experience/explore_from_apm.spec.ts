/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  spaceTest,
  TRACES,
  RICH_TRACE,
  setupTracesExperience,
  teardownTracesExperience,
} from '../../fixtures/traces_experience';
import type { TracesExperienceTestFixtures } from '../../fixtures/traces_experience';

const APM_TIME_RANGE = {
  rangeFrom: TRACES.DEFAULT_START_TIME,
  rangeTo: TRACES.DEFAULT_END_TIME,
};

async function expectTracesExperienceEnabled(
  pageObjects: TracesExperienceTestFixtures['pageObjects']
) {
  await pageObjects.discover.waitForDocTableRendered();
  for (const column of pageObjects.tracesExperience.grid.expectedColumns) {
    await expect(pageObjects.discover.getColumnHeader(column)).toBeVisible();
  }
  await expect(pageObjects.tracesExperience.charts.redMetricsCharts).toBeVisible();
}

spaceTest.describe(
  'Traces in Discover - Explore from APM',
  {
    tag: [...tags.stateful.all, ...tags.serverless.observability.complete],
  },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace, config }) => {
      await setupTracesExperience(scoutSpace, config);
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await teardownTracesExperience(scoutSpace);
    });

    spaceTest(
      'Service Inventory - "Open in Discover" links open correct experience',
      async ({ page, pageObjects }) => {
        await spaceTest.step('navigate to APM service inventory', async () => {
          await page.gotoApp('apm/services', {
            params: APM_TIME_RANGE,
          });
        });

        await spaceTest.step('"Open traces in Discover" opens traces experience', async () => {
          await pageObjects.tracesExperience.apm.clickManagedTableRowAction(
            RICH_TRACE.SERVICE_NAME,
            'apmManagedTableActionsMenuItem-servicesTable-openTracesInDiscover'
          );
          await expectTracesExperienceEnabled(pageObjects);
          await page.goBack();
        });

        await spaceTest.step('"Open logs in Discover" opens Discover', async () => {
          await pageObjects.tracesExperience.apm.clickManagedTableRowAction(
            RICH_TRACE.SERVICE_NAME,
            'apmManagedTableActionsMenuItem-servicesTable-openLogsInDiscover'
          );
          await pageObjects.discover.waitForDocTableRendered();
          await expect(page.testSubj.locator('discoverDocTable')).toBeVisible();
        });
      }
    );

    spaceTest(
      'Service Overview - "Open in Discover" links open traces experience',
      async ({ page, pageObjects }) => {
        await spaceTest.step('navigate to APM service overview', async () => {
          await page.gotoApp(`apm/services/${RICH_TRACE.SERVICE_NAME}/overview`, {
            params: APM_TIME_RANGE,
          });
        });

        await spaceTest.step('Latency chart opens traces experience', async () => {
          await page.testSubj.locator('apmLatencyChartOpenInDiscover').click();
          await expectTracesExperienceEnabled(pageObjects);
          await pageObjects.tracesExperience.openDocumentFlyout(pageObjects.discover);
          await expect(pageObjects.tracesExperience.flyout.overviewTab).toBeVisible();
          await page.goBack();
        });

        await spaceTest.step('Throughput chart opens traces experience', async () => {
          await page.testSubj.locator('apmServiceOverviewThroughputChartOpenInDiscover').click();
          await expectTracesExperienceEnabled(pageObjects);
          await page.goBack();
        });

        await spaceTest.step('Failed transaction rate chart opens traces experience', async () => {
          await page.testSubj.locator('apmFailedTransactionRateChartOpenInDiscover').click();
          await expectTracesExperienceEnabled(pageObjects);
          await page.goBack();
        });

        await spaceTest.step('Transactions table opens traces experience', async () => {
          await expect(page.testSubj.locator('transactionsGroupTable')).toBeVisible();
          await pageObjects.tracesExperience.apm.clickManagedTableRowAction(
            RICH_TRACE.TRANSACTION_NAME,
            'apmManagedTableActionsMenuItem-transactionsTable-openInDiscover',
            'transactionsGroupTable'
          );
          await expectTracesExperienceEnabled(pageObjects);
        });
      }
    );

    spaceTest(
      'Transactions page - "Open in Discover" links open traces experience',
      async ({ page, pageObjects }) => {
        await spaceTest.step('navigate to APM transactions page', async () => {
          await page.gotoApp(`apm/services/${RICH_TRACE.SERVICE_NAME}/transactions`, {
            params: APM_TIME_RANGE,
          });
        });

        await spaceTest.step('Latency chart opens traces experience', async () => {
          await page.testSubj.locator('apmLatencyChartOpenInDiscover').click();
          await expectTracesExperienceEnabled(pageObjects);
          await page.goBack();
        });

        await spaceTest.step('Throughput chart opens traces experience', async () => {
          await page.testSubj.locator('apmServiceOverviewThroughputChartOpenInDiscover').click();
          await expectTracesExperienceEnabled(pageObjects);
          await page.goBack();
        });

        await spaceTest.step('Failed transaction rate chart opens traces experience', async () => {
          await page.testSubj.locator('apmFailedTransactionRateChartOpenInDiscover').click();
          await expectTracesExperienceEnabled(pageObjects);
          await page.goBack();
        });

        await spaceTest.step('Transactions table opens traces experience', async () => {
          await expect(page.testSubj.locator('transactionsGroupTable')).toBeVisible();
          await pageObjects.tracesExperience.apm.clickManagedTableRowAction(
            RICH_TRACE.TRANSACTION_NAME,
            'apmManagedTableActionsMenuItem-transactionsTable-openInDiscover',
            'transactionsGroupTable'
          );
          await expectTracesExperienceEnabled(pageObjects);
        });
      }
    );

    spaceTest(
      'Transaction Detail - "Open in Discover" links open traces experience',
      async ({ page, pageObjects }) => {
        const transactionDetailParams = {
          ...APM_TIME_RANGE,
          transactionName: RICH_TRACE.TRANSACTION_NAME,
          transactionType: 'request',
        };

        await spaceTest.step('navigate to APM transaction detail', async () => {
          await page.gotoApp(`apm/services/${RICH_TRACE.SERVICE_NAME}/transactions/view`, {
            params: transactionDetailParams,
          });
        });

        await spaceTest.step('Latency chart opens traces experience', async () => {
          await page.testSubj.locator('apmLatencyChartOpenInDiscover').click();
          await expectTracesExperienceEnabled(pageObjects);
          await page.goBack();
        });

        await spaceTest.step('Throughput chart opens traces experience', async () => {
          await page.testSubj.locator('apmServiceOverviewThroughputChartOpenInDiscover').click();
          await expectTracesExperienceEnabled(pageObjects);
          await page.goBack();
        });

        await spaceTest.step('Failed transaction rate chart opens traces experience', async () => {
          await page.testSubj.locator('apmFailedTransactionRateChartOpenInDiscover').click();
          await expectTracesExperienceEnabled(pageObjects);
          await page.goBack();
        });

        await spaceTest.step('"Open in Discover" button opens traces experience', async () => {
          await page.testSubj.locator('apmWaterfallOpenInDiscoverButton').click();
          await expectTracesExperienceEnabled(pageObjects);
          await pageObjects.tracesExperience.openDocumentFlyout(pageObjects.discover);
          await expect(pageObjects.tracesExperience.flyout.overviewTab).toBeVisible();
          await page.goBack();
        });

        await spaceTest.step('Span flyout "Open in Discover" opens traces experience', async () => {
          await pageObjects.tracesExperience.apm.clickWaterfallItem(RICH_TRACE.DB_SPAN_NAME);
          await page.testSubj.locator('spanFlyoutViewSpanInDiscoverLink').click();
          await expectTracesExperienceEnabled(pageObjects);
          await page.goBack();
          await pageObjects.tracesExperience.apm.dismissFlyout();
        });

        await spaceTest.step('Latency correlations opens traces experience', async () => {
          await page.testSubj.locator('apmLatencyCorrelationsTabButton').click();
          await page.testSubj.locator('apmLatencyCorrelationsOpenInDiscoverButton').click();
          await expectTracesExperienceEnabled(pageObjects);
          await page.goBack();
        });

        await spaceTest.step(
          'Failed transactions correlations opens traces experience',
          async () => {
            await page.testSubj.locator('apmFailedTransactionsCorrelationsTabButton').click();
            await page.testSubj.locator('apmFailedCorrelationsViewInDiscoverButton').click();
            await expectTracesExperienceEnabled(pageObjects);
          }
        );
      }
    );

    spaceTest(
      'Errors page - "Open in Discover" links open traces experience',
      async ({ page, pageObjects }) => {
        await spaceTest.step('navigate to APM errors page', async () => {
          await page.gotoApp(`apm/services/${RICH_TRACE.SERVICE_NAME}/errors`, {
            params: APM_TIME_RANGE,
          });
        });

        await spaceTest.step('Failed transaction rate chart opens traces experience', async () => {
          await page.testSubj.locator('apmFailedTransactionRateChartOpenInDiscover').click();
          await expectTracesExperienceEnabled(pageObjects);
          await page.goBack();
        });

        await spaceTest.step('Error sample "Open in Discover" opens Discover', async () => {
          await pageObjects.tracesExperience.apm.clickDetailLink(
            RICH_TRACE.ERRORS.TRANSACTION_DB_ERROR
          );
          await page.testSubj.locator('errorGroupDetailsOpenErrorInDiscoverButton').click();
          await pageObjects.discover.waitForDocTableRendered();
          await expect(page.testSubj.locator('discoverDocTable')).toBeVisible();
        });
      }
    );

    spaceTest(
      'Transaction Detail - Waterfall size warning "view in Discover" link opens traces experience',
      async ({ page, pageObjects }) => {
        const transactionDetailParams = {
          ...APM_TIME_RANGE,
          transactionName: RICH_TRACE.TRANSACTION_NAME,
          transactionType: 'request',
        };

        await spaceTest.step('intercept trace API to force exceedsMax condition', async () => {
          await page.route('**/internal/apm/traces/**', async (route) => {
            const url = new URL(route.request().url());
            url.searchParams.set('maxTraceItems', '2');
            await route.continue({ url: url.toString() });
          });
        });

        await spaceTest.step('navigate to APM transaction detail', async () => {
          await page.gotoApp(`apm/services/${RICH_TRACE.SERVICE_NAME}/transactions/view`, {
            params: transactionDetailParams,
          });
        });

        await spaceTest.step('waterfall size warning is visible', async () => {
          await expect(page.testSubj.locator('apmWaterfallSizeWarning')).toBeVisible();
        });

        await spaceTest.step(
          'warning "view in Discover" link opens traces experience',
          async () => {
            await page.testSubj.locator('apmWaterfallSizeWarningDiscoverLink').click();
            await expectTracesExperienceEnabled(pageObjects);
            await page.unrouteAll({ behavior: 'wait' });
          }
        );
      }
    );

    spaceTest(
      'Dependencies - "Open in Discover" from operation detail opens traces experience',
      async ({ page, pageObjects }) => {
        await spaceTest.step('navigate to APM dependencies page', async () => {
          await page.gotoApp('apm/dependencies/operations', {
            params: {
              ...APM_TIME_RANGE,
              dependencyName: 'postgresql',
            },
          });
        });

        await spaceTest.step('open operation detail and click Open in Discover', async () => {
          await pageObjects.tracesExperience.apm.clickDetailLink(RICH_TRACE.DB_SPAN_NAME);
          await page.testSubj.locator('apmWaterfallOpenInDiscoverButton').click();
        });

        await spaceTest.step('verify traces experience loaded', async () => {
          await expectTracesExperienceEnabled(pageObjects);
        });
      }
    );
  }
);
