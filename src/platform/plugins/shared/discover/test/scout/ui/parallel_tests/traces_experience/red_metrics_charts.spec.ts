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

spaceTest.describe(
  'Traces in Discover - RED metrics charts',
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

    spaceTest('should render RED metrics charts in ESQL mode', async ({ pageObjects }) => {
      await pageObjects.discover.goto({ queryMode: 'esql' });

      await spaceTest.step('run ESQL query for traces', async () => {
        await pageObjects.discover.writeAndSubmitEsqlQuery(TRACES.ESQL_QUERY);
      });

      await spaceTest.step('verify RED metrics charts are visible', async () => {
        const { charts } = pageObjects.tracesExperience;

        await expect(charts.redMetricsCharts).toBeVisible();

        for (const title of charts.expectedTitles) {
          await expect(charts.getChartTitle(title)).toBeVisible();
          await expect(charts.getChartError(title)).toBeHidden();
        }
      });
    });

    spaceTest('should render RED metrics charts with WHERE filter', async ({ pageObjects }) => {
      await pageObjects.discover.goto({ queryMode: 'esql' });

      await spaceTest.step('run ESQL query with WHERE filter', async () => {
        await pageObjects.discover.writeAndSubmitEsqlQuery(
          `${TRACES.ESQL_QUERY} | WHERE service.name == "${RICH_TRACE.SERVICE_NAME}"`
        );
      });

      await spaceTest.step('verify RED metrics charts are visible', async () => {
        const { charts } = pageObjects.tracesExperience;

        await expect(charts.redMetricsCharts).toBeVisible();

        for (const title of charts.expectedTitles) {
          await expect(charts.getChartTitle(title)).toBeVisible();
          await expect(charts.getChartError(title)).toBeHidden();
        }
      });
    });

    spaceTest(
      'should not render RED metrics charts with transformative ESQL query',
      async ({ pageObjects }) => {
        await pageObjects.discover.goto({ queryMode: 'esql' });

        await spaceTest.step('run transformative ESQL query', async () => {
          await pageObjects.discover.writeAndSubmitEsqlQuery(
            `${TRACES.ESQL_QUERY} | STATS count()`
          );
        });

        await spaceTest.step('verify RED metrics charts are not visible', async () => {
          await expect(pageObjects.tracesExperience.charts.redMetricsCharts).toBeHidden();
        });
      }
    );

    spaceTest(
      'should not render RED metrics charts in data view mode',
      async ({ page, pageObjects }) => {
        await pageObjects.discover.goto({ queryMode: 'classic' });

        await spaceTest.step('verify data table is loaded', async () => {
          await pageObjects.discover.waitForDocTableRendered();
          await expect(page.testSubj.locator('discoverDocTable')).toBeVisible();
        });

        await spaceTest.step('verify RED metrics charts are not visible', async () => {
          await expect(pageObjects.tracesExperience.charts.redMetricsCharts).toBeHidden();
        });
      }
    );
  }
);
