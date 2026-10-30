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
  LATENCY_TRACE,
  setupTracesExperience,
  teardownTracesExperience,
} from '../fixtures';

spaceTest.describe(
  'Traces in Discover - latency map',
  {
    tag: [...tags.stateful.all, ...tags.serverless.observability.complete],
  },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace, config }) => {
      await setupTracesExperience(scoutSpace, config);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.discover.goto({ queryMode: 'esql' });
      await pageObjects.discover.writeAndSubmitEsqlQuery(LATENCY_TRACE.ESQL_QUERY);
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await teardownTracesExperience(scoutSpace);
    });

    spaceTest(
      'shows the RED charts by default and the latency map on demand',
      async ({ pageObjects }) => {
        const { charts } = pageObjects.tracesExperience;

        await spaceTest.step('the RED charts are the default view', async () => {
          await expect(charts.redMetricsCharts).toBeVisible();
          await expect(charts.latencyMapToggle).toBeVisible();
          // The grid wrapper is shared, so the RED view shows by its own charts.
          await expect(charts.getChartTitle('Throughput')).toBeVisible();
          await expect(charts.latencyMap).toBeHidden();
        });

        await spaceTest.step('the switcher brings up the latency map', async () => {
          await charts.latencyMapToggle.click();
          await expect(charts.latencyMap).toBeVisible();
          await charts.waitForLatencyMapReady();
          await expect(charts.latencyMapLegend).toBeVisible();
        });

        await spaceTest.step('and back to the RED charts', async () => {
          await charts.healthMetricsToggle.click();
          await expect(charts.latencyMap).toBeHidden();
          await expect(charts.getChartTitle('Throughput')).toBeVisible();
        });
      }
    );

    spaceTest(
      'a drawn selection rewrites the query and clearing it restores the query',
      async ({ pageObjects }) => {
        const { charts } = pageObjects.tracesExperience;
        const { discover } = pageObjects;

        await charts.latencyMapToggle.click();
        await charts.waitForLatencyMapReady();

        await spaceTest.step('a drag becomes a WHERE clause of the query', async () => {
          await charts.dragLatencyMapSelection();
          await expect(charts.latencyMapSelectionBar).toBeVisible();
          await expect
            .poll(async () => discover.getEsqlQueryValue())
            .toMatch(/WHERE @timestamp >= TO_DATETIME\(".+"\) AND @timestamp < TO_DATETIME/);
          expect(await discover.getEsqlQueryValue()).toContain('transaction.duration.us >=');
        });

        await spaceTest.step('the documents follow the selection', async () => {
          await discover.waitUntilSearchingHasFinished();
          // The selection is a part of the range, so it matches fewer documents than the query.
          await expect(charts.latencyMapSelectionBar).toBeVisible();
        });

        await spaceTest.step('clearing the selection restores the query', async () => {
          await charts.latencyMapClearSelection.click();
          await expect
            .poll(async () => (await discover.getEsqlQueryValue()).trim())
            .toBe(LATENCY_TRACE.ESQL_QUERY);
          await expect(charts.latencyMapSelectionBar).toBeHidden();
        });
      }
    );

    spaceTest(
      'a reload with the selection in the query restores the map and the selection',
      async ({ pageObjects, page }) => {
        const { charts } = pageObjects.tracesExperience;

        await charts.latencyMapToggle.click();
        await charts.waitForLatencyMapReady();
        await charts.dragLatencyMapSelection();
        await expect(charts.latencyMapSelectionBar).toBeVisible();

        await page.reload();
        await pageObjects.discover.waitUntilTabIsLoaded();

        // The query carries the selection, so the map view opens with it highlighted.
        await expect(charts.latencyMap).toBeVisible();
        await charts.waitForLatencyMapReady();
        await expect(charts.latencyMapSelectionBar).toBeVisible();
      }
    );

    spaceTest('a click on a cell opens the document flyout', async ({ pageObjects }) => {
      const { charts } = pageObjects.tracesExperience;

      await charts.latencyMapToggle.click();
      await charts.waitForLatencyMapReady();

      // The middle of the map sits in the dense 100ms band of the test data.
      await charts.clickLatencyMapCell();

      await pageObjects.docViewer.waitForFlyoutOpen();
      await expect(pageObjects.docViewer.getFlyout()).toContainText(LATENCY_TRACE.SERVICE_NAME);
    });
  }
);
