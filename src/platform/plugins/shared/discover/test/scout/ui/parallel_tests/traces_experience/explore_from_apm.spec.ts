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

const APM_TIME_RANGE = {
  rangeFrom: TRACES.DEFAULT_START_TIME,
  rangeTo: TRACES.DEFAULT_END_TIME,
};

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
      'Service Overview - Latency chart "Open in Discover" opens traces experience',
      async ({ page, pageObjects }) => {
        await spaceTest.step('navigate to APM service overview', async () => {
          await page.gotoApp(`apm/services/${RICH_TRACE.SERVICE_NAME}/overview`, {
            params: APM_TIME_RANGE,
          });
        });

        await spaceTest.step('click Open in Discover on latency chart', async () => {
          await page.testSubj.locator('apmLatencyChartOpenInDiscover').click();
        });

        await spaceTest.step('verify Discover traces experience columns', async () => {
          await pageObjects.discover.waitForDocTableRendered();
          for (const column of pageObjects.tracesExperience.grid.expectedColumns) {
            await expect(pageObjects.discover.getColumnHeader(column)).toBeVisible();
          }
        });

        await spaceTest.step('verify Overview tab in document flyout', async () => {
          await pageObjects.tracesExperience.openDocumentFlyout(pageObjects.discover);
          await expect(pageObjects.tracesExperience.flyout.overviewTab).toBeVisible();
        });
      }
    );

    spaceTest(
      'Service Overview - Throughput chart "Open in Discover" opens traces experience',
      async ({ page, pageObjects }) => {
        await spaceTest.step('navigate to APM service overview', async () => {
          await page.gotoApp(`apm/services/${RICH_TRACE.SERVICE_NAME}/overview`, {
            params: APM_TIME_RANGE,
          });
        });

        await spaceTest.step('click Open in Discover on throughput chart', async () => {
          await page.testSubj.locator('apmServiceOverviewThroughputChartOpenInDiscover').click();
        });

        await spaceTest.step('verify Discover traces experience columns', async () => {
          await pageObjects.discover.waitForDocTableRendered();
          for (const column of pageObjects.tracesExperience.grid.expectedColumns) {
            await expect(pageObjects.discover.getColumnHeader(column)).toBeVisible();
          }
        });
      }
    );

    spaceTest(
      'Service Overview - Failed transaction rate chart "Open in Discover" opens traces experience',
      async ({ page, pageObjects }) => {
        await spaceTest.step('navigate to APM service overview', async () => {
          await page.gotoApp(`apm/services/${RICH_TRACE.SERVICE_NAME}/overview`, {
            params: APM_TIME_RANGE,
          });
        });

        await spaceTest.step(
          'click Open in Discover on failed transaction rate chart',
          async () => {
            await page.testSubj.locator('apmFailedTransactionRateChartOpenInDiscover').click();
          }
        );

        await spaceTest.step('verify Discover traces experience columns', async () => {
          await pageObjects.discover.waitForDocTableRendered();
          for (const column of pageObjects.tracesExperience.grid.expectedColumns) {
            await expect(pageObjects.discover.getColumnHeader(column)).toBeVisible();
          }
        });
      }
    );

    spaceTest(
      'Service Overview - Transactions table "Open in Discover" opens traces experience',
      async ({ page, pageObjects }) => {
        await spaceTest.step('navigate to APM service overview', async () => {
          await page.gotoApp(`apm/services/${RICH_TRACE.SERVICE_NAME}/overview`, {
            params: APM_TIME_RANGE,
          });
        });

        await spaceTest.step('open row actions menu on transaction row', async () => {
          await expect(page.testSubj.locator('transactionsGroupTable')).toBeVisible();
          await pageObjects.tracesExperience.clickRowAction(
            RICH_TRACE.TRANSACTION_NAME,
            'transactionsGroupTable'
          );
        });

        await spaceTest.step('click Open in Discover in actions menu', async () => {
          await page.testSubj
            .locator('apmManagedTableActionsMenuItem-transactionsTable-openInDiscover')
            .click();
        });

        await spaceTest.step('verify Discover traces experience columns', async () => {
          await pageObjects.discover.waitForDocTableRendered();
          for (const column of pageObjects.tracesExperience.grid.expectedColumns) {
            await expect(pageObjects.discover.getColumnHeader(column)).toBeVisible();
          }
        });
      }
    );

    spaceTest(
      'Transactions - Latency chart "Open in Discover" opens traces experience',
      async ({ page, pageObjects }) => {
        await spaceTest.step('navigate to APM transactions page', async () => {
          await page.gotoApp(`apm/services/${RICH_TRACE.SERVICE_NAME}/transactions`, {
            params: APM_TIME_RANGE,
          });
        });

        await spaceTest.step('click Open in Discover on latency chart', async () => {
          await page.testSubj.locator('apmLatencyChartOpenInDiscover').click();
        });

        await spaceTest.step('verify Discover traces experience columns', async () => {
          await pageObjects.discover.waitForDocTableRendered();
          for (const column of pageObjects.tracesExperience.grid.expectedColumns) {
            await expect(pageObjects.discover.getColumnHeader(column)).toBeVisible();
          }
        });
      }
    );

    spaceTest(
      'Transactions - Throughput chart "Open in Discover" opens traces experience',
      async ({ page, pageObjects }) => {
        await spaceTest.step('navigate to APM transactions page', async () => {
          await page.gotoApp(`apm/services/${RICH_TRACE.SERVICE_NAME}/transactions`, {
            params: APM_TIME_RANGE,
          });
        });

        await spaceTest.step('click Open in Discover on throughput chart', async () => {
          await page.testSubj.locator('apmServiceOverviewThroughputChartOpenInDiscover').click();
        });

        await spaceTest.step('verify Discover traces experience columns', async () => {
          await pageObjects.discover.waitForDocTableRendered();
          for (const column of pageObjects.tracesExperience.grid.expectedColumns) {
            await expect(pageObjects.discover.getColumnHeader(column)).toBeVisible();
          }
        });
      }
    );

    spaceTest(
      'Transactions - Failed transaction rate chart "Open in Discover" opens traces experience',
      async ({ page, pageObjects }) => {
        await spaceTest.step('navigate to APM transactions page', async () => {
          await page.gotoApp(`apm/services/${RICH_TRACE.SERVICE_NAME}/transactions`, {
            params: APM_TIME_RANGE,
          });
        });

        await spaceTest.step(
          'click Open in Discover on failed transaction rate chart',
          async () => {
            await page.testSubj.locator('apmFailedTransactionRateChartOpenInDiscover').click();
          }
        );

        await spaceTest.step('verify Discover traces experience columns', async () => {
          await pageObjects.discover.waitForDocTableRendered();
          for (const column of pageObjects.tracesExperience.grid.expectedColumns) {
            await expect(pageObjects.discover.getColumnHeader(column)).toBeVisible();
          }
        });
      }
    );

    spaceTest(
      'Transactions - Transactions table "Open in Discover" opens traces experience',
      async ({ page, pageObjects }) => {
        await spaceTest.step('navigate to APM transactions page', async () => {
          await page.gotoApp(`apm/services/${RICH_TRACE.SERVICE_NAME}/transactions`, {
            params: APM_TIME_RANGE,
          });
        });

        await spaceTest.step('open row actions menu on transaction row', async () => {
          await expect(page.testSubj.locator('transactionsGroupTable')).toBeVisible();
          await pageObjects.tracesExperience.clickRowAction(
            RICH_TRACE.TRANSACTION_NAME,
            'transactionsGroupTable'
          );
        });

        await spaceTest.step('click Open in Discover in actions menu', async () => {
          await page.testSubj
            .locator('apmManagedTableActionsMenuItem-transactionsTable-openInDiscover')
            .click();
        });

        await spaceTest.step('verify Discover traces experience columns', async () => {
          await pageObjects.discover.waitForDocTableRendered();
          for (const column of pageObjects.tracesExperience.grid.expectedColumns) {
            await expect(pageObjects.discover.getColumnHeader(column)).toBeVisible();
          }
        });
      }
    );

    spaceTest(
      'Transaction Detail - Latency chart "Open in Discover" opens traces experience',
      async ({ page, pageObjects }) => {
        await spaceTest.step('navigate to APM transaction detail', async () => {
          await page.gotoApp(`apm/services/${RICH_TRACE.SERVICE_NAME}/transactions/view`, {
            params: {
              ...APM_TIME_RANGE,
              transactionName: RICH_TRACE.TRANSACTION_NAME,
              transactionType: 'request',
            },
          });
        });

        await spaceTest.step('click Open in Discover on latency chart', async () => {
          await page.testSubj.locator('apmLatencyChartOpenInDiscover').click();
        });

        await spaceTest.step('verify Discover traces experience columns', async () => {
          await pageObjects.discover.waitForDocTableRendered();
          for (const column of pageObjects.tracesExperience.grid.expectedColumns) {
            await expect(pageObjects.discover.getColumnHeader(column)).toBeVisible();
          }
        });
      }
    );

    spaceTest(
      'Transaction Detail - Throughput chart "Open in Discover" opens traces experience',
      async ({ page, pageObjects }) => {
        await spaceTest.step('navigate to APM transaction detail', async () => {
          await page.gotoApp(`apm/services/${RICH_TRACE.SERVICE_NAME}/transactions/view`, {
            params: {
              ...APM_TIME_RANGE,
              transactionName: RICH_TRACE.TRANSACTION_NAME,
              transactionType: 'request',
            },
          });
        });

        await spaceTest.step('click Open in Discover on throughput chart', async () => {
          await page.testSubj.locator('apmServiceOverviewThroughputChartOpenInDiscover').click();
        });

        await spaceTest.step('verify Discover traces experience columns', async () => {
          await pageObjects.discover.waitForDocTableRendered();
          for (const column of pageObjects.tracesExperience.grid.expectedColumns) {
            await expect(pageObjects.discover.getColumnHeader(column)).toBeVisible();
          }
        });
      }
    );

    spaceTest(
      'Transaction Detail - Failed transaction rate chart "Open in Discover" opens traces experience',
      async ({ page, pageObjects }) => {
        await spaceTest.step('navigate to APM transaction detail', async () => {
          await page.gotoApp(`apm/services/${RICH_TRACE.SERVICE_NAME}/transactions/view`, {
            params: {
              ...APM_TIME_RANGE,
              transactionName: RICH_TRACE.TRANSACTION_NAME,
              transactionType: 'request',
            },
          });
        });

        await spaceTest.step(
          'click Open in Discover on failed transaction rate chart',
          async () => {
            await page.testSubj.locator('apmFailedTransactionRateChartOpenInDiscover').click();
          }
        );

        await spaceTest.step('verify Discover traces experience columns', async () => {
          await pageObjects.discover.waitForDocTableRendered();
          for (const column of pageObjects.tracesExperience.grid.expectedColumns) {
            await expect(pageObjects.discover.getColumnHeader(column)).toBeVisible();
          }
        });
      }
    );

    spaceTest(
      'Transaction Detail - "Open in Discover" button opens traces experience',
      async ({ page, pageObjects }) => {
        await spaceTest.step('navigate to APM transaction detail', async () => {
          await page.gotoApp(`apm/services/${RICH_TRACE.SERVICE_NAME}/transactions/view`, {
            params: {
              ...APM_TIME_RANGE,
              transactionName: RICH_TRACE.TRANSACTION_NAME,
              transactionType: 'request',
            },
          });
        });

        await spaceTest.step('click Open in Discover button', async () => {
          await page.testSubj.locator('apmWaterfallOpenInDiscoverButton').click();
        });

        await spaceTest.step('verify Discover traces experience columns', async () => {
          await pageObjects.discover.waitForDocTableRendered();
          for (const column of pageObjects.tracesExperience.grid.expectedColumns) {
            await expect(pageObjects.discover.getColumnHeader(column)).toBeVisible();
          }
        });

        await spaceTest.step('verify Overview tab in document flyout', async () => {
          await pageObjects.tracesExperience.openDocumentFlyout(pageObjects.discover);
          await expect(pageObjects.tracesExperience.flyout.overviewTab).toBeVisible();
        });
      }
    );

    spaceTest(
      'Transaction Detail - Span flyout "Open in Discover" opens traces experience',
      async ({ page, pageObjects }) => {
        await spaceTest.step('navigate to APM transaction detail', async () => {
          await page.gotoApp(`apm/services/${RICH_TRACE.SERVICE_NAME}/transactions/view`, {
            params: {
              ...APM_TIME_RANGE,
              transactionName: RICH_TRACE.TRANSACTION_NAME,
              transactionType: 'request',
            },
          });
        });

        await spaceTest.step('click a span in the waterfall to open span flyout', async () => {
          await pageObjects.tracesExperience.clickWaterfallSpan(RICH_TRACE.DB_SPAN_NAME);
        });

        await spaceTest.step('click Open in Discover in span flyout', async () => {
          await page.testSubj.locator('spanFlyoutViewSpanInDiscoverLink').click();
        });

        await spaceTest.step('verify Discover traces experience columns', async () => {
          await pageObjects.discover.waitForDocTableRendered();
          for (const column of pageObjects.tracesExperience.grid.expectedColumns) {
            await expect(pageObjects.discover.getColumnHeader(column)).toBeVisible();
          }
        });
      }
    );

    spaceTest(
      'Errors - Failed transaction rate chart "Open in Discover" opens traces experience',
      async ({ page, pageObjects }) => {
        await spaceTest.step('navigate to APM errors page', async () => {
          await page.gotoApp(`apm/services/${RICH_TRACE.SERVICE_NAME}/errors`, {
            params: APM_TIME_RANGE,
          });
        });

        await spaceTest.step(
          'click Open in Discover on failed transaction rate chart',
          async () => {
            await page.testSubj.locator('apmFailedTransactionRateChartOpenInDiscover').click();
          }
        );

        await spaceTest.step('verify Discover traces experience columns', async () => {
          await pageObjects.discover.waitForDocTableRendered();
          for (const column of pageObjects.tracesExperience.grid.expectedColumns) {
            await expect(pageObjects.discover.getColumnHeader(column)).toBeVisible();
          }
        });
      }
    );

    spaceTest(
      'Errors - "Open in Discover" from error sample opens traces experience',
      async ({ page, pageObjects }) => {
        await spaceTest.step('navigate to APM errors page', async () => {
          await page.gotoApp(`apm/services/${RICH_TRACE.SERVICE_NAME}/errors`, {
            params: APM_TIME_RANGE,
          });
        });

        await spaceTest.step('click into first error group', async () => {
          await pageObjects.tracesExperience.clickTableLink(RICH_TRACE.ERRORS.TRANSACTION_DB_ERROR);
        });

        await spaceTest.step('click Open in Discover on error sample', async () => {
          await page.testSubj.locator('errorGroupDetailsOpenErrorInDiscoverButton').click();
        });

        await spaceTest.step('verify Discover loads with data', async () => {
          await pageObjects.discover.waitForDocTableRendered();
          await expect(page.testSubj.locator('discoverDocTable')).toBeVisible();
        });
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

        await spaceTest.step('click into operation detail to view a trace sample', async () => {
          await pageObjects.tracesExperience.clickTableLink(RICH_TRACE.DB_SPAN_NAME);
        });

        await spaceTest.step('click Open in Discover button', async () => {
          await page.testSubj.locator('apmWaterfallOpenInDiscoverButton').click();
        });

        await spaceTest.step('verify Discover traces experience columns', async () => {
          await pageObjects.discover.waitForDocTableRendered();
          for (const column of pageObjects.tracesExperience.grid.expectedColumns) {
            await expect(pageObjects.discover.getColumnHeader(column)).toBeVisible();
          }
        });
      }
    );

    spaceTest(
      'Service Inventory - "Open traces in Discover" opens traces experience',
      async ({ page, pageObjects }) => {
        await spaceTest.step('navigate to APM service inventory', async () => {
          await page.gotoApp('apm/services', {
            params: APM_TIME_RANGE,
          });
        });

        await spaceTest.step('open row actions menu on service row', async () => {
          await pageObjects.tracesExperience.clickRowAction(RICH_TRACE.SERVICE_NAME);
        });

        await spaceTest.step('click Open traces in Discover in actions menu', async () => {
          await page.testSubj
            .locator('apmManagedTableActionsMenuItem-servicesTable-openTracesInDiscover')
            .click();
        });

        await spaceTest.step('verify Discover traces experience columns', async () => {
          await pageObjects.discover.waitForDocTableRendered();
          for (const column of pageObjects.tracesExperience.grid.expectedColumns) {
            await expect(pageObjects.discover.getColumnHeader(column)).toBeVisible();
          }
        });
      }
    );

    spaceTest(
      'Service Inventory - "Open logs in Discover" opens Discover',
      async ({ page, pageObjects }) => {
        await spaceTest.step('navigate to APM service inventory', async () => {
          await page.gotoApp('apm/services', {
            params: APM_TIME_RANGE,
          });
        });

        await spaceTest.step('open row actions menu on service row', async () => {
          await pageObjects.tracesExperience.clickRowAction(RICH_TRACE.SERVICE_NAME);
        });

        await spaceTest.step('click Open logs in Discover in actions menu', async () => {
          await page.testSubj
            .locator('apmManagedTableActionsMenuItem-servicesTable-openLogsInDiscover')
            .click();
        });

        await spaceTest.step('verify Discover loads with data', async () => {
          await pageObjects.discover.waitForDocTableRendered();
          await expect(page.testSubj.locator('discoverDocTable')).toBeVisible();
        });
      }
    );
  }
);
