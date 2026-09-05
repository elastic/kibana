/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import type { DiscoverSessionApiDataInput } from '../../../../../server/api/schema';
import { spaceTest, tags, testData } from '../../../common/ui/fixtures';

const FLIGHTS_DATA_VIEW = 'kibana_sample_data_flights';
const FLIGHTS_TIME_RANGE = {
  from: '2018-04-10T00:00:00.000Z',
  to: '2018-11-15T00:00:00.000Z',
};
const CUSTOM_ROWS_PER_PAGE = 10;

spaceTest.describe('Discover session panel interactions', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults({ loadFlightsDataView: true });
    await discoverScoutSpace.uiSettings.setDefaultTime(FLIGHTS_TIME_RANGE);
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest('surfaces an invalid KQL error in a dashboard panel', async ({ page, pageObjects }) => {
    const { dashboard, discover, queryBar } = pageObjects;

    await dashboard.openNewDashboard();
    await dashboard.addSavedSearch(testData.SAVED_SEARCH_TITLE);
    await dashboard.waitForRenderComplete();

    await queryBar.setQuery('this < is not : a valid > query');
    await discover.submitQuery();

    await expect(page.testSubj.locator('embeddableError')).toBeVisible();
    await expect(page.testSubj.locator('errorMessageMarkdown')).toContainText(
      /Expected[\S\s]+but "n" found/
    );
  });

  spaceTest(
    'persists rows per page after saving and reloading a dashboard',
    async ({ apiServices, discoverScoutSpace, page, pageObjects, scoutSpace }) => {
      const { dashboard, dataGrid } = pageObjects;
      const savedSearchName = `Paginated Discover session ${scoutSpace.id}`;
      const dashboardName = `Dashboard with paginated Discover session ${scoutSpace.id}`;

      await apiServices.discover.create(
        {
          title: savedSearchName,
          tabs: [
            {
              id: 'flights-data-view',
              label: 'Flights data view',
              data_source: {
                type: 'data_view_reference',
                ref_id: discoverScoutSpace.getDataViewId(FLIGHTS_DATA_VIEW),
              },
              rows_per_page: testData.DEFAULT_ROWS_PER_PAGE,
            },
          ],
        } satisfies DiscoverSessionApiDataInput,
        scoutSpace.id
      );

      await dashboard.openNewDashboard();
      await dashboard.addSavedSearch(savedSearchName);
      await dashboard.waitForRenderComplete();

      expect(await dataGrid.getDocTableRowCount()).toBeGreaterThan(0);
      expect(await dataGrid.getCurrentRowsPerPage()).toBe(testData.DEFAULT_ROWS_PER_PAGE);

      await dashboard.saveDashboard(dashboardName);
      await page.reload();
      await dashboard.waitForRenderComplete();

      expect(await dataGrid.getCurrentRowsPerPage()).toBe(testData.DEFAULT_ROWS_PER_PAGE);

      await dataGrid.changeRowsPerPageTo(CUSTOM_ROWS_PER_PAGE);
      await expect.poll(() => dataGrid.getCurrentRowsPerPage()).toBe(CUSTOM_ROWS_PER_PAGE);
      await expect(dashboard.unsavedChangesIndicator).toBeVisible();
      await dashboard.saveChangesToExistingDashboard();
      await expect(dashboard.unsavedChangesIndicator).toBeHidden();

      await page.reload();
      await dashboard.waitForRenderComplete();

      expect(await dataGrid.getCurrentRowsPerPage()).toBe(CUSTOM_ROWS_PER_PAGE);
    }
  );
});
