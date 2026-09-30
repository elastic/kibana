/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import type { DiscoverSessionApiDataInput } from '@kbn/as-code-discover-schema';
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
      'shares one inline data view across API-created tabs after saving in Discover and reloading the dashboard',
      async ({ apiServices, page, pageObjects, scoutSpace }) => {
        const { dashboard, discover, filterBar } = pageObjects;
        const tabs = [
          { id: 'original', label: 'Original' },
          { id: 'copy', label: 'Copy' },
        ];
        const savedSearchName = `Shared inline view ${scoutSpace.id}`;
        const session: DiscoverSessionApiDataInput = {
          title: savedSearchName,
          tabs: tabs.map((tab) => ({
            ...tab,
            data_source: {
              type: 'data_view_spec',
              index_pattern: 'logstash*',
              time_field: '@timestamp',
            },
            column_order: ['extension'],
          })),
        };
        const sessionId = await apiServices.discover.create(session, scoutSpace.id);
        const panelHitCounts = page.testSubj.locator('savedSearchTotalDocuments');

        const readPanelHitCounts = async () =>
          (await panelHitCounts.allTextContents()).map((text) =>
            Number.parseInt(text.replace(/,/g, ''), 10)
          );

        const expectFilteredPanels = async (unfilteredCount: number) => {
          await expect(async () => {
            const counts = await readPanelHitCounts();
            const [count] = counts;

            expect(count).toBeGreaterThan(0);
            expect(count).toBeLessThan(unfilteredCount);
            expect(counts).toStrictEqual([count, count]);
          }).toPass({ timeout: 10_000 });
        };

        const expectSharedFilterEditor = async () => {
          await filterBar.clickEditFilter('extension.raw', 'css');
          await expect
            .poll(() => page.components.comboBox('filterFieldSuggestionList').getSelectedOptions())
            .toStrictEqual(['extension.raw']);
          await expect(page.testSubj.locator('filterIndexPatternsSelect')).toBeHidden();
          await expect
            .poll(() => filterBar.getFilterEditorSelectedPhrases())
            .toStrictEqual(['css']);
          await expect(page.testSubj.locator('saveFilter')).toBeEnabled();
          await filterBar.closeFieldEditorModal();
        };

        await spaceTest.step('save a title change in Discover', async () => {
          await discover.goto({ queryMode: 'classic', savedSearchId: sessionId });
          await discover.waitUntilTabIsLoaded();
          await discover.saveSearch(`${savedSearchName} saved`);
          await expect(discover.unsavedChangesIndicator()).toBeHidden();
        });

        const unfilteredCount = await spaceTest.step(
          'filter both tabs as linked dashboard panels',
          async () => {
            const dashboardId = await apiServices.dashboard.create(
              {
                title: `Shared inline view dashboard ${scoutSpace.id}`,
                panels: tabs.map(({ id, label }, index) => ({
                  id,
                  type: 'discover_session',
                  grid: { x: index * 24, y: 0, w: 24, h: 15 },
                  config: { ref_id: sessionId, selected_tab_id: id, title: label },
                })),
              },
              scoutSpace.id
            );
            await dashboard.openDashboardWithIdInEditMode(dashboardId);
            await dashboard.waitForPanelsToLoad(2);
            await expect(async () => {
              const counts = await readPanelHitCounts();
              const [count] = counts;

              expect(count).toBeGreaterThan(0);
              expect(counts).toStrictEqual([count, count]);
            }).toPass({ timeout: 10_000 });
            const [initialCount] = await readPanelHitCounts();

            await filterBar.addFilter({ field: 'extension.raw', operator: 'is', value: 'css' });
            await expectFilteredPanels(initialCount);
            await expectSharedFilterEditor();

            return initialCount;
          }
        );

        await spaceTest.step('save and reload the dashboard', async () => {
          await dashboard.saveChangesToExistingDashboard();
          await page.reload();
          await dashboard.waitForPanelsToLoad(2);

          await expectFilteredPanels(unfilteredCount);
          await expectSharedFilterEditor();
          await expect(page.testSubj.locator('embeddableError')).toHaveCount(0);
          await expect(dashboard.unsavedChangesIndicator).toBeHidden();
        });
      }
    );

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
