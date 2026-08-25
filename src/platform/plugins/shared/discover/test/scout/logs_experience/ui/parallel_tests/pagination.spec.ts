/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SEARCH_EMBEDDABLE_TYPE } from '@kbn/discover-utils';
import type { DataGrid, Locator } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  spaceTest,
  createNonLogsDiscoverSession,
  LOGS,
  LOGS_EXPERIENCE_TAGS,
  setupLogsExperience,
  teardownLogsExperience,
} from '../fixtures';

/** Re-scrolls because the app drops scroll events that arrive before `loadingState` settles, and never re-evaluates the gate. */
const scrollUntilFooterVisible = async (dataGrid: DataGrid, footer: Locator) => {
  await expect(async () => {
    await dataGrid.scrollToBottom();
    await expect(footer).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 30_000 });
};

spaceTest.describe(
  'Logs profile - Pagination (getPaginationConfig)',
  {
    tag: LOGS_EXPERIENCE_TAGS,
  },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace, config }) => {
      await setupLogsExperience(scoutSpace, config);

      // Keeps the sample below the ~300 indexed docs, so the footer mounts and Load more has a page to fetch.
      await scoutSpace.uiSettings.set({ 'discover:sampleSize': 100 });
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('discover:sampleSize');
      await teardownLogsExperience(scoutSpace);
    });

    spaceTest(
      'should keep numbered pagination for a non-logs data view (multiPage mode)',
      async ({ apiServices, scoutSpace, pageObjects }) => {
        const { discover, dataGrid } = pageObjects;

        // An index pattern matching no allowed log base pattern, so the default multiPage mode applies.
        const sessionId = await createNonLogsDiscoverSession(
          apiServices,
          scoutSpace.id,
          'non-logs-pagination'
        );

        // Opened by id: the "Open search" flyout filters via a saved-object search, which lags the write.
        await discover.goto({ queryMode: 'classic', savedSearchId: sessionId });
        await discover.waitUntilTabIsLoaded();

        // Asserted on the locator, not `getCurrentRowsPerPage()`, which throws on a late-rendering toolbar.
        await expect(dataGrid.getRowsPerPageButton()).toContainText('Rows per page: 100');
        await expect(dataGrid.getPreviousPageButton()).toBeVisible();
        await expect(dataGrid.getNextPageButton()).toBeVisible();
        await expect(dataGrid.getPageButton(0)).toBeVisible();
      }
    );

    spaceTest(
      'should drop the pagination toolbar for a logs data view and offer a Load-more footer',
      async ({ pageObjects }) => {
        const { discover, dataGrid } = pageObjects;

        await discover.goto({ queryMode: 'classic' });
        await discover.selectDataView(LOGS.SYNTH_LOGS_DATA_VIEW);
        await discover.waitUntilTabIsLoaded();

        await expect(dataGrid.getRowsPerPageButton()).toBeHidden();
        await expect(dataGrid.getPreviousPageButton()).toBeHidden();
        await expect(dataGrid.getNextPageButton()).toBeHidden();

        const footer = dataGrid.getFooter();
        const loadMore = dataGrid.getLoadMoreButton();

        await expect(footer).toBeHidden();

        await scrollUntilFooterVisible(dataGrid, footer);
        await expect(loadMore).toBeVisible();

        // Fetching more resets `hasScrolledToBottom`, so the footer goes away again.
        await loadMore.click();
        await dataGrid.waitForLoad();
        await expect(footer).toBeHidden();

        await expect(dataGrid.getDocTableWrapper()).toHaveAttribute('data-document-number', '200');

        await dataGrid.scrollToRow(150);
        await expect(footer).toBeHidden();
        await expect(loadMore).toBeHidden();
      }
    );

    spaceTest(
      'should render no pagination toolbar and no footer in ES|QL mode',
      async ({ pageObjects }) => {
        const { discover, dataGrid } = pageObjects;

        // ES|QL overrides the profile's singlePage mode, disabling the toolbar and the footer.
        await discover.goto({ queryMode: 'esql' });
        await discover.writeAndSubmitEsqlQuery(
          `from ${LOGS.SYNTH_LOGS_DATA_VIEW} | sort @timestamp desc | limit 200`
        );

        // Everything below is an absence, so prove the grid rendered rows first.
        expect(await dataGrid.getDocTableRowCount()).toBeGreaterThan(0);

        await dataGrid.scrollToBottom();

        await expect(dataGrid.getRowsPerPageButton()).toBeHidden();
        await expect(dataGrid.getPreviousPageButton()).toBeHidden();
        await expect(dataGrid.getNextPageButton()).toBeHidden();
        await expect(dataGrid.getFooter()).toBeHidden();
      }
    );

    spaceTest(
      'should render the singlePage footer without a Load-more button in a dashboard panel',
      async ({ apiServices, scoutSpace, pageObjects }) => {
        const { dashboard, dataGrid } = pageObjects;

        // A panel's own `sample_size` governs an embeddable, not the space-wide setting.
        const dashboardId = await apiServices.dashboard.create(
          {
            title: `logs-pagination-embeddable-${scoutSpace.id}`,
            time_range: {
              from: LOGS.DEFAULT_START_TIME,
              to: LOGS.DEFAULT_END_TIME,
              mode: 'absolute',
            },
            panels: [
              {
                type: SEARCH_EMBEDDABLE_TYPE,
                grid: { x: 0, y: 0, w: 24, h: 15 },
                config: {
                  sample_size: 100,
                  tabs: [
                    {
                      data_source: {
                        type: 'data_view_spec',
                        index_pattern: LOGS.SYNTH_LOGS_DATA_VIEW,
                        time_field: '@timestamp',
                      },
                    },
                  ],
                },
              },
            ],
          },
          scoutSpace.id
        );

        await dashboard.openDashboardWithId(dashboardId);

        expect(await dataGrid.getDocTableRowCount()).toBeGreaterThan(0);

        await expect(dataGrid.getRowsPerPageButton()).toBeHidden();
        await expect(dataGrid.getPreviousPageButton()).toBeHidden();
        await expect(dataGrid.getNextPageButton()).toBeHidden();

        await expect(dataGrid.getFooter()).toBeHidden();

        // Embeddables pass no `onFetchMoreRecords`, so they get the message-only footer.
        await scrollUntilFooterVisible(dataGrid, dataGrid.getFooter());
        await expect(dataGrid.getLoadMoreButton()).toBeHidden();
      }
    );
  }
);
