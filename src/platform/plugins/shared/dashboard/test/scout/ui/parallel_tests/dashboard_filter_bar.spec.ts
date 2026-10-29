/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardApiDataInput } from '@kbn/as-code-dashboard-schema';
import { spaceTest, tags } from '@kbn/scout';
import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const LOGSTASH_DATA_VIEW_ID = 'filter-bar-logstash';
const ANIMALS_DATA_VIEW_ID = 'filter-bar-animals';
const MISSING_DATA_VIEW_ID = 'filter-bar-missing';

const ANIMALS_TIME_RANGE = { from: '2018-01-01T00:00:00.000Z', to: '2018-04-13T00:00:00.000Z' };
const TIME_RANGE = { from: '2015-09-19T06:31:44.000Z', to: '2015-09-23T18:31:44.000Z' };

type DashboardFilter = NonNullable<DashboardApiDataInput['filters']>[number];

const phraseFilter = (
  field: string,
  value: string,
  options: { disabled?: boolean; dataViewId?: string }
): DashboardFilter => ({
  type: 'condition',
  condition: { field, operator: 'is', value },
  disabled: options.disabled,
  data_view_id: options.dataViewId,
});

const BAD_FILTERS: DashboardFilter[] = [
  phraseFilter('name', 'moo', { disabled: true, dataViewId: MISSING_DATA_VIEW_ID }),
  phraseFilter('baad-field', 'moo', { disabled: true, dataViewId: ANIMALS_DATA_VIEW_ID }),
  phraseFilter('@timestamp', '123', { dataViewId: LOGSTASH_DATA_VIEW_ID }),
  {
    type: 'condition',
    condition: { field: 'extension', operator: 'exists' },
    data_view_id: LOGSTASH_DATA_VIEW_ID,
  },
  phraseFilter('banana', 'yellow', {}),
];

type DashboardPanel = NonNullable<DashboardApiDataInput['panels']>[number];

const dataViewSpec = (indexPattern: string) =>
  ({
    type: 'data_view_spec',
    index_pattern: indexPattern,
    time_field: '@timestamp',
  } as const);

const ANIMALS_METRIC_PANEL: DashboardPanel = {
  type: 'vis',
  grid: { x: 0, y: 0, w: 24, h: 15 },
  config: {
    type: 'metric',
    data_source: dataViewSpec('animals-*'),
    metrics: [{ type: 'primary', operation: 'count' }],
  },
};
// Document counts in the animals archive: all animals, and cats only
const ANIMALS_COUNT = 23;
const CATS_COUNT = 11;

const DATA_TABLE_PANEL: DashboardPanel = {
  type: 'vis',
  grid: { x: 0, y: 0, w: 48, h: 15 },
  config: {
    type: 'data_table',
    data_source: dataViewSpec('logstash-*'),
    metrics: [{ operation: 'count' }],
    rows: [{ operation: 'terms', fields: ['bytes'], limit: 5 }],
  },
};

const getFieldSuggestions = async (page: ScoutPage) => {
  await page.testSubj.click('addFilter');
  const fields = await page.components.comboBox('filterFieldSuggestionList').getAllVisibleOptions();
  await page.testSubj.click('cancelSaveFilter');
  await expect(page.testSubj.locator('addFilterPopover')).toBeHidden();
  return fields;
};

let emptyDashboardId = '';
let badFiltersDashboardId = '';
let animalsDashboardId = '';
let dataTableDashboardId = '';

// Focus: how the filter bar behaves: its visibility, its field list, and how filters persist and load
spaceTest.describe('Dashboard filter bar', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();

    await apiServices.dataViews.create({
      id: LOGSTASH_DATA_VIEW_ID,
      title: 'logstash-*',
      timeFieldName: '@timestamp',
      spaceId: scoutSpace.id,
    });
    await apiServices.dataViews.create({
      id: ANIMALS_DATA_VIEW_ID,
      title: 'animals-*',
      timeFieldName: '@timestamp',
      spaceId: scoutSpace.id,
    });
    await scoutSpace.uiSettings.set({ defaultIndex: LOGSTASH_DATA_VIEW_ID });

    emptyDashboardId = await apiServices.dashboard.create(
      { title: 'Filter bar: empty', time_range: TIME_RANGE },
      scoutSpace.id
    );
    animalsDashboardId = await apiServices.dashboard.create(
      {
        title: 'Filter bar: animals',
        time_range: ANIMALS_TIME_RANGE,
        panels: [ANIMALS_METRIC_PANEL],
      },
      scoutSpace.id
    );
    dataTableDashboardId = await apiServices.dashboard.create(
      { title: 'Filter bar: table', time_range: TIME_RANGE, panels: [DATA_TABLE_PANEL] },
      scoutSpace.id
    );
    badFiltersDashboardId = await apiServices.dashboard.create(
      { title: 'dashboard with bad filters', time_range: TIME_RANGE, filters: BAD_FILTERS },
      scoutSpace.id
    );
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'shows default data view fields on an empty dashboard',
    async ({ page, pageObjects }) => {
      await pageObjects.dashboard.openDashboardWithIdInEditMode(emptyDashboardId);
      await expect(page.testSubj.locator('addFilter')).toBeVisible();

      // An empty dashboard falls back to the default data view
      expect(await getFieldSuggestions(page)).toContain('bytes');
    }
  );

  spaceTest(
    'shows panel data view fields on a dashboard with panels',
    async ({ page, pageObjects }) => {
      await pageObjects.dashboard.openDashboardWithIdInEditMode(animalsDashboardId);
      await pageObjects.dashboard.waitForRenderComplete();

      // The panel's data view is used instead of the default (logstash-*) data view
      const fields = await getFieldSuggestions(page);
      expect(fields).toContain('animal');
      expect(fields).not.toContain('bytes');
    }
  );

  spaceTest('filter pills', async ({ page, pageObjects }) => {
    const { dashboard, filterBar, queryBar } = pageObjects;

    // The dashboard has a single metric panel with a single tile
    const expectMetricValue = (value: number) =>
      expect(page.testSubj.locator('mtrVis').locator('.echMetricText__valueBlock')).toHaveText(
        String(value)
      );

    const saveCopyAs = async (title: string) => {
      await dashboard.ensureEditMode();
      await dashboard.saveDashboardAsCopy(title);
      await dashboard.waitForRenderComplete();
    };

    // Goes through the listing page so the global (pinned) filters carry over
    const openSavedDashboardFromListing = async (title: string) => {
      await page
        .locator('[data-test-subj~="breadcrumb"]')
        .filter({ hasText: /^Dashboards$/ })
        .click();
      await dashboard.clickDashboardTitleLink(title);
    };

    await dashboard.openDashboardWithId(animalsDashboardId);

    await spaceTest.step('are added through the filter bar', async () => {
      // No filters are selected by default
      expect(await filterBar.getFilterCount()).toBe(0);
      await expectMetricValue(ANIMALS_COUNT);
      await filterBar.addFilter({ field: 'animal', operator: 'is', value: 'cat' });
      await expect.poll(() => filterBar.getFilterCount()).toBe(1);
      await expectMetricValue(CATS_COUNT);
    });

    await spaceTest.step('are preserved after saving a dashboard', async () => {
      await saveCopyAs('with filters');
      expect(await filterBar.getFilterCount()).toBe(1);
      await expectMetricValue(CATS_COUNT);
    });

    await spaceTest.step('are preserved after opening a dashboard saved with filters', async () => {
      await dashboard.goto();
      await dashboard.clickDashboardTitleLink('with filters');
      await queryBar.submitQuery();
      expect(await filterBar.getFilterCount()).toBe(1);
      await expectMetricValue(CATS_COUNT);
    });

    await spaceTest.step("restoring filters doesn't break the back button", async () => {
      await page.goBack();
      await expect(page.testSubj.locator('dashboardLandingPage')).toBeVisible();
      await page.goForward();
      await dashboard.waitForRenderComplete();
      await queryBar.submitQuery();
      await expectMetricValue(CATS_COUNT);
    });

    await spaceTest.step("saving with a pinned filter doesn't unpin it", async () => {
      await filterBar.toggleFilterPinned('animal');
      await saveCopyAs('saved with pinned filters');
      expect(await filterBar.hasFilter({ field: 'animal', pinned: true })).toBe(true);
      await expectMetricValue(CATS_COUNT);
    });

    await spaceTest.step(
      "navigating to a dashboard with a global filter doesn't unpin it if the same filter is saved with the dashboard",
      async () => {
        await page.reload();
        await dashboard.waitForRenderComplete();
        await openSavedDashboardFromListing('with filters');
        expect(await filterBar.hasFilter({ field: 'animal', pinned: true })).toBe(true);
        await expectMetricValue(CATS_COUNT);
      }
    );

    await spaceTest.step("pinned filters aren't saved", async () => {
      await filterBar.removeFilter('animal');
      await openSavedDashboardFromListing('saved with pinned filters');
      expect(await filterBar.getFilterCount()).toBe(0);
      await expectMetricValue(ANIMALS_COUNT);
    });
  });

  spaceTest('data table cell filtering', async ({ page, pageObjects }) => {
    const { dashboard, filterBar } = pageObjects;

    await dashboard.openDashboardWithId(dataTableDashboardId);
    await dashboard.waitForRenderComplete();

    await spaceTest.step('filters are added when a cell filter button is clicked', async () => {
      // Column 0 is the row number column, so the "bytes" column is at index 1
      const cell = page.locator(
        '[data-test-subj="dataGridRowCell"][data-gridcell-column-index="1"][data-gridcell-visible-row-index="0"]'
      );
      await cell.hover();
      await cell.getByTestId('lensDatatableFilterFor').click();
      await expect.poll(() => filterBar.getFilterCount()).toBe(1);
    });
  });

  spaceTest('bad filters are loaded properly', async ({ pageObjects }) => {
    const { dashboard, filterBar } = pageObjects;

    await dashboard.openDashboardWithId(badFiltersDashboardId);

    const expectFilter = (field: string, value: string, enabled: boolean) =>
      expect.poll(() => filterBar.hasFilter({ field, value, enabled })).toBe(true);

    await spaceTest.step(
      'filter with a non-existent index pattern renders if it matches a field',
      () => expectFilter('name', 'moo', false)
    );

    await spaceTest.step('filter with a non-existent field renders in warning mode', () =>
      expectFilter('baad-field', 'warn', false)
    );

    await spaceTest.step(
      'filter from an unrelated index pattern is still applicable if the field name is found',
      () => expectFilter('@timestamp', '123', true)
    );

    await spaceTest.step(
      'filter from an unrelated index pattern renders as a warning if the field name is not found',
      () => expectFilter('extension', 'warn', true)
    );

    await spaceTest.step(
      'filter without an index pattern renders as a warning if the dashboard has an index pattern',
      () => expectFilter('banana', 'warn', true)
    );
  });
});
