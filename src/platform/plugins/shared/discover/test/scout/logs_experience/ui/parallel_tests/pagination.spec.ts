/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SEARCH_EMBEDDABLE_TYPE } from '@kbn/discover-utils';
import { expect } from '@kbn/scout/ui';
import {
  spaceTest,
  createNonLogsDiscoverSession,
  LOGS,
  LOGS_EXPERIENCE_TAGS,
  setupLogsExperience,
  teardownLogsExperience,
} from '../fixtures';

spaceTest.describe(
  'Logs profile - Pagination',
  {
    tag: LOGS_EXPERIENCE_TAGS,
  },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace, config }) => {
      await setupLogsExperience(scoutSpace, config);

      // Needed by the logs data view test: the footer gate gives up unless
      // rowCount (100) < totalHits (~300). Harmless for the other tests — the non-logs data view
      // has fewer docs than the sample size, ES|QL disables pagination outright, and the dashboard
      // panel carries its own `sample_size`.
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
      'should use numbered pagination for a non-logs data view',
      async ({ apiServices, scoutSpace, pageObjects }) => {
        const { discover, dataGrid } = pageObjects;

        // A data view whose index pattern matches no allowed log base pattern, so the default
        // multiPage mode applies.
        const sessionId = await createNonLogsDiscoverSession(
          apiServices,
          scoutSpace.id,
          'non-logs-pagination'
        );

        // Open by id rather than through the "Open search" flyout: that flyout filters via a
        // saved-object *search*, which lags behind the write when workers run concurrently.
        await discover.goto({ queryMode: 'classic', savedSearchId: sessionId });
        await discover.waitUntilTabIsLoaded();

        // Numbered pagination controls must be present, showing the default rows per page.
        // Asserted on the locator rather than via `getCurrentRowsPerPage()`: that helper throws
        // when the label isn't parseable yet, and `expect.poll` does not retry a throwing
        // callback, so the locator assertion is the one that tolerates a late-rendering toolbar.
        await expect(dataGrid.getRowsPerPageButton()).toContainText('Rows per page: 100');
        await expect(dataGrid.getPreviousPageButton()).toBeVisible();
        await expect(dataGrid.getNextPageButton()).toBeVisible();
        // The page number button confirms a real multi-page toolbar, not just arrows.
        await expect(dataGrid.getPageButton(0)).toBeVisible();
      }
    );

    spaceTest(
      'should switch to singlePage mode with a Load-more footer for a logs data view',
      async ({ pageObjects }) => {
        const { discover, dataGrid } = pageObjects;

        await discover.goto({ queryMode: 'classic' });
        await discover.selectDataView(LOGS.SYNTH_LOGS_DATA_VIEW);
        await discover.waitUntilTabIsLoaded();

        // singlePage mode: no EUI pagination toolbar.
        await expect(dataGrid.getRowsPerPageButton()).toBeHidden();
        await expect(dataGrid.getPreviousPageButton()).toBeHidden();
        await expect(dataGrid.getNextPageButton()).toBeHidden();

        const footer = dataGrid.getFooter();
        const loadMore = dataGrid.getLoadMoreButton();

        // Footer is absent before scrolling: hasScrolledToBottom starts false.
        await expect(footer).toBeHidden();

        // Scroll to the bottom — the throttled scroll handler flips hasScrolledToBottom.
        await dataGrid.scrollToBottom();

        await expect(footer).toBeVisible();
        await expect(loadMore).toBeVisible();

        // Click Load more, wait for the follow-up fetch, then confirm the footer disappears.
        // `loadingState === loadingMore` resets hasScrolledToBottom, so no second scroll is needed.
        await loadMore.click();
        await dataGrid.waitForLoad();
        await expect(footer).toBeHidden();

        // After scrolling again the footer reappears reporting the new total.
        await dataGrid.scrollToBottom();
        await expect(footer).toContainText('Search results are limited to 200 documents');
      }
    );

    spaceTest(
      'should render no pagination toolbar and no footer in ES|QL mode',
      async ({ pageObjects }) => {
        const { discover, dataGrid } = pageObjects;

        // `logs-*` resolves the logs profile, which sets paginationMode: 'singlePage'.
        // ES|QL overrides that: isPaginationEnabled={false} disables both the toolbar and footer.
        await discover.goto({ queryMode: 'esql' });
        await discover.writeAndSubmitEsqlQuery(
          `from ${LOGS.SYNTH_LOGS_DATA_VIEW} | sort @timestamp desc | limit 200`
        );

        // The assertions below are all absences, so prove the grid actually rendered rows first.
        expect(await dataGrid.getDocTableRowCount()).toBeGreaterThan(0);

        // Scroll to the bottom — even without visible controls, we confirm none appear.
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

        // Build the dashboard and its panel via the API — no archives, no UI steps.
        // `sample_size: 100` on the panel is what governs an embeddable, so the footer gate
        // (rowCount < totalHits) holds regardless of the space-wide setting.
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

        // The panel must have rendered some data.
        expect(await dataGrid.getDocTableRowCount()).toBeGreaterThan(0);

        // singlePage mode: no EUI pagination toolbar.
        await expect(dataGrid.getRowsPerPageButton()).toBeHidden();
        await expect(dataGrid.getPreviousPageButton()).toBeHidden();
        await expect(dataGrid.getNextPageButton()).toBeHidden();

        // Footer is hidden until the user scrolls to the bottom.
        await expect(dataGrid.getFooter()).toBeHidden();

        // Embeddables do not pass `onFetchMoreRecords`, so the message-only footer renders
        // (no Load-more button) once hasScrolledToBottom flips.
        await dataGrid.scrollToBottom();
        await expect(dataGrid.getFooter()).toBeVisible();
        await expect(dataGrid.getLoadMoreButton()).toBeHidden();
      }
    );
  }
);
