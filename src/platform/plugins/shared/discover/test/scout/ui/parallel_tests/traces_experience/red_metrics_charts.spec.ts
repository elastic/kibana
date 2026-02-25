/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { TRACES } from '../../fixtures/traces_experience';

const RED_METRICS_CHART_TITLES = ['Latency', 'Error Rate', 'Throughput'];

spaceTest.describe(
  'Traces in Discover - RED metrics charts',
  {
    tag: [...tags.stateful.all, ...tags.serverless.observability.complete],
  },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace, config }) => {
      if (!config.serverless) {
        await scoutSpace.setSolutionView('oblt');
      }
      await scoutSpace.savedObjects.load(TRACES.KBN_ARCHIVE);
      await scoutSpace.uiSettings.setDefaultIndex(TRACES.DATA_VIEW_NAME);
      await scoutSpace.uiSettings.setDefaultTime({
        from: TRACES.DEFAULT_START_TIME,
        to: TRACES.DEFAULT_END_TIME,
      });
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.discover.goto();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest('should render RED metrics charts in ESQL mode', async ({ page, pageObjects }) => {
      await spaceTest.step('run ESQL query for traces', async () => {
        await pageObjects.discover.writeEsqlQuery(TRACES.ESQL_QUERY);
      });

      await spaceTest.step('verify RED metrics charts are visible', async () => {
        const grid = page.testSubj.locator('metricsExperienceGrid');
        await expect(grid).toBeVisible();
        for (const title of RED_METRICS_CHART_TITLES) {
          await expect(grid.getByText(title)).toBeVisible();
        }
      });
    });

    spaceTest(
      'should render RED metrics charts with WHERE filter',
      async ({ page, pageObjects }) => {
        await spaceTest.step('run ESQL query with WHERE filter', async () => {
          await pageObjects.discover.writeEsqlQuery(
            `${TRACES.ESQL_QUERY} | WHERE service.name == "synth-traces-frontend"`
          );
        });

        await spaceTest.step('verify RED metrics charts are visible', async () => {
          const grid = page.testSubj.locator('metricsExperienceGrid');
          await expect(grid).toBeVisible();

          for (const title of RED_METRICS_CHART_TITLES) {
            await expect(grid.getByText(title)).toBeVisible();
          }
        });
      }
    );

    spaceTest(
      'should not render RED metrics charts in data view mode',
      async ({ page, pageObjects }) => {
        await spaceTest.step('verify data table is loaded', async () => {
          await pageObjects.discover.waitForDocTableRendered();
          await expect(page.testSubj.locator('discoverDocTable')).toBeVisible();
        });

        await spaceTest.step('verify RED metrics grid is not visible', async () => {
          await expect(page.testSubj.locator('metricsExperienceGrid')).toBeHidden();
        });
      }
    );

    spaceTest(
      'should not render RED metrics charts with transformative ESQL query',
      async ({ page, pageObjects }) => {
        await spaceTest.step('run transformative ES|QL query', async () => {
          await pageObjects.discover.writeEsqlQuery(`${TRACES.ESQL_QUERY} | STATS count()`);
        });

        await spaceTest.step('verify RED metrics grid is not visible', async () => {
          await expect(page.testSubj.locator('metricsExperienceGrid')).toBeHidden();
        });
      }
    );
  }
);
