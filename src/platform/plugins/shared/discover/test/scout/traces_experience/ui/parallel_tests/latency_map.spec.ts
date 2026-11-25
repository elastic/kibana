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
      'shows the latency map by default and the RED charts on demand',
      async ({ pageObjects }) => {
        const { charts } = pageObjects.tracesExperience;

        await spaceTest.step('the latency map is the default view', async () => {
          await expect(charts.latencyMap).toBeVisible();
          await expect(charts.healthMetricsToggle).toBeVisible();
          await charts.waitForLatencyMapReady();
          await expect(charts.latencyMapLegend).toBeVisible();
        });

        await spaceTest.step('the switcher brings up the RED charts', async () => {
          await charts.healthMetricsToggle.click();
          await expect(charts.latencyMap).toBeHidden();
          await expect(charts.redMetricsCharts).toBeVisible();
          // The grid wrapper is shared, so the RED view shows by its own charts.
          await expect(charts.getChartTitle('Throughput')).toBeVisible();
        });

        await spaceTest.step('and back to the latency map', async () => {
          await charts.latencyMapToggle.click();
          await expect(charts.latencyMap).toBeVisible();
        });
      }
    );

    spaceTest(
      'a drawn selection rewrites the query and clearing it restores the query',
      async ({ pageObjects }) => {
        const { charts } = pageObjects.tracesExperience;
        const { discover } = pageObjects;

        // The map is the default view.
        await charts.waitForLatencyMapReady();
        await discover.waitUntilSearchingHasFinished();
        const hitsBeforeSelection = await discover.getHitCountInt();

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
          await expect
            .poll(async () => discover.getHitCountInt())
            .toBeLessThan(hitsBeforeSelection);
        });

        await spaceTest.step('clearing the selection restores the query', async () => {
          await charts.latencyMapClearSelection.click();
          await expect
            .poll(async () => (await discover.getEsqlQueryValue()).trim())
            .toBe(LATENCY_TRACE.ESQL_QUERY);
          await expect(charts.latencyMapSelectionBar).toBeHidden();
        });

        await spaceTest.step('a drag starting above the map catches the top rows', async () => {
          // The press lands in the gap under the header, where a drag aiming at the
          // slowest row naturally starts; it draws from the top edge of the plot.
          await charts.dragLatencyMapSelection({ x: 0.25, y: -0.02 }, { x: 0.75, y: 0.4 });
          await expect(charts.latencyMapSelectionBar).toBeVisible();
          await expect
            .poll(async () => discover.getEsqlQueryValue())
            .toMatch(/WHERE @timestamp >= TO_DATETIME\(".+"\) AND @timestamp < TO_DATETIME/);
        });
      }
    );

    spaceTest(
      'a reload with the selection in the query restores the map and the selection',
      async ({ pageObjects, page }) => {
        const { charts } = pageObjects.tracesExperience;

        // The map is the default view.
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

    spaceTest(
      'focusing an operation from the suggestions dropdown narrows the query',
      async ({ pageObjects }) => {
        const { charts } = pageObjects.tracesExperience;
        const { discover } = pageObjects;

        // The map is the default view.
        await charts.waitForLatencyMapReady();

        await spaceTest.step('picking the mixed operation writes its WHERE clause', async () => {
          await charts.latencyMapDurationGroups.click();
          // By name: the dropdown ranks the suggestions by span count, not by fixture order.
          await charts.latencyMapSuggestion(LATENCY_TRACE.TRANSACTION_NAME_MIXED).click();
          await expect
            .poll(async () => discover.getEsqlQueryValue())
            .toContain(`transaction.name == "${LATENCY_TRACE.TRANSACTION_NAME_MIXED}"`);
          await expect(charts.latencyMapOperationBadge).toBeVisible();
        });

        await spaceTest.step('the focused operation draws its duration groups', async () => {
          await charts.waitForLatencyMapReady();
          // The chart tells the map where its cells are from the first cell hovered. The map
          // keeps the previous grid while the focused one loads, so a hover may land before
          // the chart has its new cells: hovered again until the chart has answered.
          await expect(async () => {
            await charts.hoverLatencyMap();
            await expect(charts.latencyMapBand(1)).toBeVisible({ timeout: 1000 });
          }).toPass({ timeout: 15_000 });
        });

        await spaceTest.step('clicking a band selects the group', async () => {
          await charts.latencyMapBand(1).click();
          await expect(charts.latencyMapSelectionBar).toBeVisible();
          await charts.latencyMapClearSelection.click();
          await expect(charts.latencyMapSelectionBar).toBeHidden();
        });

        await spaceTest.step('clearing the badge restores the query', async () => {
          await charts.latencyMapOperationBadge.getByRole('button').click();
          await expect
            .poll(async () => (await discover.getEsqlQueryValue()).trim())
            .toBe(LATENCY_TRACE.ESQL_QUERY);
        });
      }
    );

    spaceTest('a click on a cell opens the document flyout', async ({ pageObjects }) => {
      const { charts } = pageObjects.tracesExperience;

      // The map is the default view.
      await charts.waitForLatencyMapReady();

      // The middle of the map sits in the dense 100ms band of the test data: the cell under
      // the pointer says so before it is clicked, so a layout change cannot turn the click
      // into a press on an empty cell.
      await charts.hoverLatencyMap();
      await expect(charts.latencyMapCellDetails).toContainText(/[1-9]\d* spans?/);
      await charts.clickLatencyMapCell();

      await pageObjects.docViewer.waitForFlyoutOpen();
      // On the traces Overview, which the map asks for, not the field table.
      await expect(pageObjects.tracesExperience.flyout.overviewTab).toHaveAttribute(
        'aria-selected',
        'true'
      );
      await expect(pageObjects.docViewer.getFlyout()).toContainText(LATENCY_TRACE.SERVICE_NAME);
    });
  }
);
