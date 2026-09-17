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
  'Logs profile - Pagination (getPaginationConfig)',
  {
    tag: LOGS_EXPERIENCE_TAGS,
  },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace, config }) => {
      await setupLogsExperience(scoutSpace, config);
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
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
      'should drop the numbered pagination toolbar for a logs data view (singlePage mode)',
      async ({ pageObjects }) => {
        const { discover, dataGrid } = pageObjects;

        await discover.goto({ queryMode: 'classic' });
        await discover.selectDataView(LOGS.SYNTH_LOGS_DATA_VIEW);
        await discover.waitUntilTabIsLoaded();

        await expect(dataGrid.getRowsPerPageButton()).toBeHidden();
        await expect(dataGrid.getPreviousPageButton()).toBeHidden();
        await expect(dataGrid.getNextPageButton()).toBeHidden();
      }
    );

    spaceTest('should render no pagination toolbar in ES|QL mode', async ({ pageObjects }) => {
      const { discover, dataGrid } = pageObjects;

      // ES|QL overrides the profile's singlePage mode, disabling pagination outright.
      await discover.goto({ queryMode: 'esql' });
      await discover.writeAndSubmitEsqlQuery(
        `from ${LOGS.SYNTH_LOGS_DATA_VIEW} | sort @timestamp desc | limit 200`
      );

      // Everything below is an absence, so prove the grid rendered rows first.
      expect(await dataGrid.getDocTableRowCount()).toBeGreaterThan(0);

      await expect(dataGrid.getRowsPerPageButton()).toBeHidden();
      await expect(dataGrid.getPreviousPageButton()).toBeHidden();
      await expect(dataGrid.getNextPageButton()).toBeHidden();
    });

    spaceTest(
      'should apply singlePage mode in a dashboard panel',
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
      }
    );
  }
);
