/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, tags } from '../fixtures';

spaceTest.describe(
  'API-created Discover session on Dashboard',
  { tag: [...tags.deploymentAgnostic, ...tags.serverless.observability.logs_essentials] },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest(
      'loads an ID-less inline session through CM and preserves its own filter after reload',
      async ({ apiServices, page, pageObjects, scoutSpace }) => {
        const { dashboard, dataGrid, filterBar } = pageObjects;
        const title = `API inline session ${scoutSpace.id}`;
        const columns = ['extension', 'bytes'];
        const sessionId = await apiServices.discover.create(
          {
            title,
            tabs: [
              {
                id: 'inline',
                label: 'Inline view',
                data_source: {
                  type: 'data_view_spec',
                  index_pattern: 'logstash*',
                  time_field: '@timestamp',
                },
                column_order: columns,
                sort: [{ name: '@timestamp', direction: 'desc' }],
                filters: [
                  {
                    type: 'condition',
                    condition: { field: 'extension.raw', operator: 'is', value: 'css' },
                  },
                ],
              },
            ],
          },
          scoutSpace.id
        );
        const dashboardId = await apiServices.dashboard.create(
          {
            title: `API session dashboard ${scoutSpace.id}`,
            panels: [
              {
                type: 'discover_session',
                grid: { x: 0, y: 0, w: 24, h: 15 },
                config: { ref_id: sessionId, selected_tab_id: 'inline' },
              },
            ],
          },
          scoutSpace.id
        );

        await spaceTest.step('load the linked panel without first saving in Discover', async () => {
          await dashboard.openDashboardWithIdInEditMode(dashboardId);
          await dashboard.waitForPanelsToLoad(1);
          await dashboard.expectLinkedToLibrary(title);
          await expect
            .poll(() => dataGrid.getColumnTitles())
            .toStrictEqual(['@timestamp', ...columns]);
          await expect(dataGrid.getCellValue(0, 'extension')).toHaveText('css');
        });

        await spaceTest.step(
          'reload and combine the saved filter with a dashboard filter',
          async () => {
            await page.reload();
            await dashboard.waitForPanelsToLoad(1);
            await dashboard.expectLinkedToLibrary(title);
            await expect(dataGrid.getCellValue(0, 'extension')).toHaveText('css');
            await expect(dashboard.unsavedChangesIndicator).toBeHidden();

            await filterBar.addFilter({ field: 'extension.raw', operator: 'is', value: 'js' });
            await expect(page.testSubj.locator('embeddedSavedSearchDocTable')).toHaveText(
              'No results found'
            );
            await expect(page.testSubj.locator('embeddableError')).toHaveCount(0);
          }
        );
      }
    );
  }
);
