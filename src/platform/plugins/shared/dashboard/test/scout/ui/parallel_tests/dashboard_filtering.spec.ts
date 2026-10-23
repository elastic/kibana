/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { NULL_PLACEHOLDER } from '@kbn/field-formats-common';
import { spaceTest, tags } from '@kbn/scout';
import type { PageObjects, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  DASHBOARD_FILTERING_ARCHIVE,
  DASHBOARD_FILTERING_BYTES_TITLE,
  DASHBOARD_FILTERING_NESTED_TITLE,
} from '../constants';
import {
  getChartDebugState,
  getPieSliceCount,
  getSliceCountForAllPies,
  filterOnPieSlice,
  POLL_OPTIONS,
} from '../../utils/chart_debug';
import { findImportedSavedObjectId } from '../../utils/migration_smoke_helpers';

const ANIMAL_SOUNDS_PIE_TITLE = 'Rendering Test: animal sounds pie';

const getTableRowCount = async (page: ScoutPage) => {
  const table = page.testSubj.locator('tbvChart').first();
  if ((await table.count()) === 0) return 0;
  return table.evaluate((element) => {
    const columns = element.querySelectorAll('.euiDataGridHeaderCell').length;
    const cells = element.querySelectorAll('[data-test-subj="dataGridRowCell"]').length;
    return columns > 0 ? cells / columns : 0;
  });
};

// Soft so that one run reports every mismatching chart value, with the texts actually rendered
const softExpect = expect.configure({ soft: true });

const expectTextsToExist = async (locator: ReturnType<ScoutPage['locator']>, texts: string[]) => {
  await softExpect
    .poll(async () => (await locator.allTextContents()).map((text) => text.trim()), POLL_OPTIONS)
    .toEqual(expect.arrayContaining(texts));
};

const getTagCloudTexts = async (page: ScoutPage) =>
  page.testSubj.locator('tagCloudVisualization').locator('text').allTextContents();

const getTexts = async (locator: ReturnType<ScoutPage['locator']>) =>
  (await locator.allTextContents()).map((text) => text.trim());

/** Everything the bytes filter is expected to change, one entry per chart type. */
const getChartSnapshot = async (page: ScoutPage) => ({
  pie: await getPieSliceCount(page),
  heatmap: (await getChartDebugState(page, 'heatmapChart'))?.axes?.x[0]?.labels.length ?? 0,
  table: await getTableRowCount(page),
  goalAndGauge: await getTexts(page.locator('.chart-label')),
  metric: await getTexts(page.locator('.legacyMtrVis__value')),
  tagCloud: await getTagCloudTexts(page),
  tsvbMetric: await getTexts(page.testSubj.locator('tsvbMetricValue')),
  tsvbTopN: await getTexts(page.testSubj.locator('tsvbTopNValue')),
  tsvbMarkdown: await getTexts(page.testSubj.locator('tsvbMarkdown')),
  timelion: await page.testSubj.locator('flotLegendLabel').count(),
});

type ChartSnapshot = Awaited<ReturnType<typeof getChartSnapshot>>;

/** Waits until two consecutive snapshots match, so lazily rendered charts have settled. */
const getStableSnapshot = async (page: ScoutPage) => {
  let previous = '';
  let stable = {} as ChartSnapshot;
  await expect
    .poll(
      async () => {
        stable = await getChartSnapshot(page);
        const serialized = JSON.stringify(stable);
        const isStable = serialized === previous;
        previous = serialized;
        return isStable;
      },
      { ...POLL_OPTIONS, intervals: [1000] }
    )
    .toBe(true);
  return stable;
};

const addFilterAndRefresh = async ({
  page,
  pageObjects,
}: {
  page: ScoutPage;
  pageObjects: PageObjects;
}) => {
  const { dashboard, filterBar, queryBar } = pageObjects;
  await dashboard.waitForRenderComplete();
  await filterBar.addFilter({ field: 'bytes', operator: 'is', value: '12345678' });
  await dashboard.waitForRenderComplete();
  // first round of requests sometimes times out, refresh all visualizations to fetch again
  await queryBar.submitQuery();
  await dashboard.waitForRenderComplete();
  await expect(page.testSubj.locator('^filter-badge')).toHaveCount(1);
};

let bytesDashboardId = '';
let nestedDashboardId = '';

spaceTest.describe('Dashboard filtering', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
    const imported = await scoutSpace.savedObjects.load(DASHBOARD_FILTERING_ARCHIVE);
    bytesDashboardId = findImportedSavedObjectId(
      imported,
      'dashboard',
      DASHBOARD_FILTERING_BYTES_TITLE
    );
    nestedDashboardId = findImportedSavedObjectId(
      imported,
      'dashboard',
      DASHBOARD_FILTERING_NESTED_TITLE
    );
    await scoutSpace.uiSettings.setDefaultIndex('logstash-*');
  });

  spaceTest.beforeEach(async ({ browserAuth, context }) => {
    // The elastic-charts debug state is read while a chart mounts, so enable it before navigation
    await context.addInitScript(() => {
      (window as unknown as { _echDebugStateFlag?: boolean })._echDebugStateFlag = true;
    });
    await browserAuth.loginAsPrivilegedUser();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('filtering on bytes', async ({ page, pageObjects }) => {
    const { dashboard, filterBar } = pageObjects;
    await dashboard.openDashboardWithId(bytesDashboardId);

    const unfiltered = await spaceTest.step('capture the unfiltered charts', () =>
      getStableSnapshot(page)
    );
    const chartKeys = Object.keys(unfiltered) as Array<keyof ChartSnapshot>;

    await spaceTest.step('adding a filter that excludes all data', async () => {
      await addFilterAndRefresh({ page, pageObjects });

      await expect(page.testSubj.locator('partitionVisEmptyValues')).toBeVisible();
      await expect(
        page.locator('[data-test-subj="heatmapChart"] [data-test-subj="emptyPlaceholder"]')
      ).toBeVisible();
      await expect(
        page.locator('[data-test-subj="tbvChartContainer"] [data-test-subj="visNoResult"]')
      ).toBeVisible();
      await expectTextsToExist(page.locator('.chart-label'), ['0', '0%']);
      await expect(
        page.locator('[data-test-subj="timeseriesVis"] [data-test-subj="visNoResult"]')
      ).toBeVisible();
      await expectTextsToExist(page.locator('.legacyMtrVis__value'), [NULL_PLACEHOLDER]);
      await expect.poll(async () => (await getTagCloudTexts(page)).length).toBe(0);
      await expectTextsToExist(page.testSubj.locator('tsvbMetricValue'), ['0 custom template']);
      await expectTextsToExist(page.testSubj.locator('tsvbTopNValue'), ['-', '-']);
      await expect(page.testSubj.locator('flotLegendLabel')).toHaveCount(0);

      const filtered = await getStableSnapshot(page);
      // Timelion's legend is only asserted in the filtered state
      for (const key of chartKeys.filter((chartKey) => chartKey !== 'timelion')) {
        softExpect(
          filtered[key],
          `${key} should change when the filter excludes all data`
        ).not.toEqual(unfiltered[key]);
      }
    });

    await spaceTest.step(
      'a pinned filter excludes data the same as an unpinned filter',
      async () => {
        await filterBar.toggleFilterPinned('bytes');
        await dashboard.waitForRenderComplete();
        await expect(page.testSubj.locator('partitionVisEmptyValues')).toBeVisible();
        await filterBar.toggleFilterPinned('bytes');
        await dashboard.waitForRenderComplete();
      }
    );

    await spaceTest.step('disabling the filter restores the unfiltered charts', async () => {
      await filterBar.toggleFilterEnabled('bytes');
      await dashboard.waitForRenderComplete();

      const disabled = await getStableSnapshot(page);
      for (const key of chartKeys) {
        softExpect(disabled[key], `${key} should match the unfiltered chart`).toEqual(
          unfiltered[key]
        );
      }
    });
  });

  spaceTest('nested filtering', async ({ page, pageObjects }) => {
    const { dashboard, filterBar, queryBar, visualize } = pageObjects;

    const editPieAndReturnToDashboard = async (edit: () => Promise<void>) => {
      await dashboard.clickPanelAction('embeddablePanelAction-editPanel', ANIMAL_SOUNDS_PIE_TITLE);
      await visualize.waitForVisualizationLoaded();
      await edit();
      await visualize.waitForVisualizationLoaded();
      await dashboard.clickVisualizeSaveAndReturn();
      await dashboard.waitForRenderComplete();
    };

    await dashboard.openDashboardWithIdInEditMode(nestedDashboardId);

    await spaceTest.step('visualization saved with a query filters data', async () => {
      await expect.poll(() => getPieSliceCount(page), POLL_OPTIONS).toBe(5);

      await editPieAndReturnToDashboard(async () => {
        await queryBar.setQuery('weightLbs:>50');
        await queryBar.submitQuery();
        await visualize.waitForVisualizationLoaded();
        await expect.poll(() => getPieSliceCount(page), POLL_OPTIONS).toBe(3);
      });
      await expect.poll(() => getPieSliceCount(page), POLL_OPTIONS).toBe(3);
    });

    await spaceTest.step('visualization filter pills filter data as expected', async () => {
      await editPieAndReturnToDashboard(async () => {
        await filterOnPieSlice(page, 'grr');
        await expect.poll(() => getPieSliceCount(page), POLL_OPTIONS).toBe(1);
      });
      await expect.poll(() => getPieSliceCount(page), POLL_OPTIONS).toBe(1);
    });

    await spaceTest.step('removing filter pills and query unfilters data', async () => {
      await editPieAndReturnToDashboard(async () => {
        await queryBar.setQuery('');
        await queryBar.submitQuery();
        await filterBar.removeFilter('sound.keyword');
        await expect.poll(() => getPieSliceCount(page), POLL_OPTIONS).toBe(5);
      });
      await expect.poll(() => getPieSliceCount(page), POLL_OPTIONS).toBe(5);
    });

    await spaceTest.step('pie chart linked to saved search filters data', async () => {
      await expect.poll(() => getSliceCountForAllPies(page), POLL_OPTIONS).toBe(7);
    });

    await spaceTest.step(
      'pie chart linked to saved search shows no data with a conflicting dashboard query',
      async () => {
        await queryBar.setQuery('weightLbs<40');
        await queryBar.submitQuery();
        await dashboard.waitForRenderComplete();
        await expect.poll(() => getPieSliceCount(page), POLL_OPTIONS).toBe(5);
      }
    );
  });
});
