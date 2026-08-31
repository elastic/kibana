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
import { spaceTest, tags, testData } from '../fixtures';

const SAVED_COLUMNS = ['agent', 'bytes', 'clientip'];

spaceTest.describe(
  'Discover session panels on Dashboard',
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
      'renders linked and by-value panels after saving and reload',
      async ({ apiServices, discoverScoutSpace, page, pageObjects, scoutSpace }) => {
        const { dashboard, dataGrid } = pageObjects;
        const savedSearchName = `Discover session panels reload ${scoutSpace.id}`;

        await apiServices.discover.create(
          {
            title: savedSearchName,
            tabs: [
              {
                id: 'persisted-columns',
                label: testData.DEFAULT_DATA_VIEW,
                data_source: {
                  type: 'data_view_reference',
                  ref_id: discoverScoutSpace.getDataViewId(testData.DEFAULT_DATA_VIEW),
                },
                column_order: SAVED_COLUMNS,
                sort: [{ name: '@timestamp', direction: 'desc' }],
              },
            ],
          } satisfies DiscoverSessionApiDataInput,
          scoutSpace.id
        );

        const clonedPanelTitle = await spaceTest.step(
          'add a linked Discover session and create a by-value clone',
          async () => {
            await dashboard.openNewDashboard();
            await dashboard.addSavedSearch(savedSearchName);
            await dashboard.waitForRenderComplete();
            await dashboard.expectLinkedToLibrary(savedSearchName);

            await expect
              .poll(() => dataGrid.getColumnTitles())
              .toStrictEqual(['@timestamp', ...SAVED_COLUMNS]);

            await dashboard.clonePanel(savedSearchName);
            await dashboard.waitForRenderComplete();

            const panelTitles = await dashboard.getPanelTitles();
            const clonedPanelTitles = panelTitles.filter((title) => title !== savedSearchName);

            expect(panelTitles).toHaveLength(2);
            expect(clonedPanelTitles).toHaveLength(1);
            return clonedPanelTitles[0];
          }
        );

        await spaceTest.step('save and reload the dashboard', async () => {
          await dashboard.saveDashboard(`Discover session panels reload ${scoutSpace.id}`);
          await page.reload();
          await dashboard.waitForPanelsToLoad(2);
        });

        await spaceTest.step('verify both Discover panels and their reference state', async () => {
          expect(await dashboard.getPanelCount()).toBe(2);
          const discoverPanels = page.testSubj.locator('embeddablePanel').filter({
            has: page.testSubj.locator('discoverDocTable'),
          });

          await expect(discoverPanels).toHaveCount(2);
          await expect(page.testSubj.locator('embeddableError')).toHaveCount(0);
          await expect.poll(() => dashboard.getSavedSearchRowCount()).toBeGreaterThan(0);

          await dashboard.expectLinkedToLibrary(savedSearchName);
          await dashboard.expectNotLinkedToLibrary(clonedPanelTitle);
          await expect(page.testSubj.locator('dashboardUnsavedChangesBadge')).toBeHidden();
        });
      }
    );
  }
);
