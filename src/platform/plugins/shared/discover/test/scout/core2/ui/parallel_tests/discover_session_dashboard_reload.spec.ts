/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApiServicesFixture, Locator, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import type { DiscoverSessionApiDataInput } from '../../../../../server/api/schema';
import { spaceTest, tags, testData } from '../fixtures';

const SAVED_COLUMNS = ['agent', 'bytes', 'clientip'];
const IGNORE_FILTER_SETTING = 'courier:ignoreFilterIfFieldNotInIndex';

const createInlineSession = async (
  apiServices: ApiServicesFixture,
  spaceId: string,
  title: string,
  dataViewName?: string
) =>
  apiServices.discover.create(
    {
      title,
      tabs: [
        {
          id: 'inline-tab',
          label: 'Inline logs',
          data_source: {
            type: 'data_view_spec',
            index_pattern: 'logst*',
            name: dataViewName,
            time_field: '@timestamp',
          },
          column_order: ['bytes'],
          query: { language: 'kql', expression: 'bytes > 0' },
        },
      ],
    },
    spaceId
  );

const getGridRowCount = async (grid: Locator) =>
  Number.parseInt((await grid.getAttribute('aria-rowcount')) ?? '', 10);

const expectBytesFilterEditor = async (page: ScoutPage, value: number) => {
  await expect
    .poll(() => page.components.comboBox('filterFieldSuggestionList').getSelectedOptions())
    .toStrictEqual(['bytes']);
  await expect(page.testSubj.locator('filterParams').getByRole('spinbutton')).toHaveValue(
    String(value)
  );
  await expect(page.testSubj.locator('saveFilter')).toBeEnabled();
};

spaceTest.describe(
  'Discover session panels on Dashboard',
  { tag: [...tags.deploymentAgnostic, ...tags.serverless.observability.logs_essentials] },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
    });

    spaceTest.beforeEach(async ({ browserAuth, scoutSpace }) => {
      await scoutSpace.uiSettings.unset(IGNORE_FILTER_SETTING);
      await browserAuth.loginAsPrivilegedUser();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace, scoutSpace }) => {
      await scoutSpace.uiSettings.unset(IGNORE_FILTER_SETTING);
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

    for (const { testName, dataViewName, clone } of [
      {
        testName: 'shares an unnamed inline Data View across repeated panels after reload',
        dataViewName: undefined,
        clone: false,
      },
      {
        testName: 'keeps an inline filter editable across linked and by-value panels after reload',
        dataViewName: 'Shared inline logs',
        clone: true,
      },
    ]) {
      spaceTest(testName, async ({ apiServices, page, pageObjects, scoutSpace }) => {
        const { dashboard, dataGrid, filterBar } = pageObjects;
        const savedSearchName = `Inline panels ${clone ? 'cloned' : 'repeated'} ${scoutSpace.id}`;

        await createInlineSession(apiServices, scoutSpace.id, savedSearchName, dataViewName);
        await dashboard.openNewDashboard();
        await dashboard.addSavedSearch(savedSearchName);
        await dashboard.waitForPanelsToLoad(1);

        const bytesCell = dataGrid.getCellValue(0, 'bytes');
        await expect(bytesCell).toHaveText(/^\s*\d[\d,]*\s*$/);
        const bytesText = (await bytesCell.innerText()).trim();
        const bytesValue = Number(bytesText.replace(/,/g, ''));
        expect(bytesValue).toBeGreaterThan(0);
        const grids = page.testSubj.locator('embeddablePanel').getByRole('grid');
        await expect(grids).toHaveAttribute('aria-rowcount', /^[1-9]\d*$/);
        const unfilteredRowCount = await getGridRowCount(grids);

        await dataGrid.filterCell({ rowIndex: 0, columnId: 'bytes', mode: 'for' });
        await expect.poll(() => getGridRowCount(grids)).toBeLessThan(unfilteredRowCount);
        const filteredRowCount = await getGridRowCount(grids);
        expect(filteredRowCount).toBeGreaterThan(0);

        const expectFilteredPanels = async (count: number) => {
          await expect(grids).toHaveCount(count);
          for (const grid of await grids.all()) {
            await expect(grid).toHaveAttribute('aria-rowcount', String(filteredRowCount));
            await expect(grid.locator(bytesCell)).toHaveText(bytesText);
          }
        };

        const expectEditableFilter = async () => {
          await expect.poll(() => filterBar.getFilterCount()).toBe(1);
          await filterBar.clickEditFilterById('0');
          await expectBytesFilterEditor(page, bytesValue);
          await expect(page.testSubj.locator('filterIndexPatternsSelect')).toHaveCount(0);
          await filterBar.closeFieldEditorModal();
        };

        await spaceTest.step('save and reload the first panel with its filter', async () => {
          await expectEditableFilter();
          await dashboard.saveDashboard(savedSearchName);
          await page.reload();
          await dashboard.waitForPanelsToLoad(1);
          await expectFilteredPanels(1);
          await expectEditableFilter();
          await expect(page.testSubj.locator('dashboardQuickSaveMenuItem')).toBeVisible();
          await expect(dashboard.unsavedChangesIndicator).toBeHidden();
        });

        await spaceTest.step('add the second panel without losing the filter', async () => {
          await dashboard.ensureEditMode();
          if (clone) {
            await dashboard.clonePanel(savedSearchName);
          } else {
            await dashboard.addSavedSearch(savedSearchName);
          }
          await dashboard.waitForPanelsToLoad(2);
          await expectFilteredPanels(2);
          await expectEditableFilter();
        });

        await spaceTest.step('save and reload both panels', async () => {
          await dashboard.saveChangesToExistingDashboard();
          await page.reload();
          await dashboard.waitForPanelsToLoad(2);
          await expectFilteredPanels(2);
          await expectEditableFilter();
          await expect(page.testSubj.locator('embeddableError')).toHaveCount(0);
          await expect(page.testSubj.locator('dashboardQuickSaveMenuItem')).toBeVisible();
          await expect(dashboard.unsavedChangesIndicator).toBeHidden();

          if (clone) {
            const clonedTitles = (await dashboard.getPanelTitles()).filter(
              (title) => title !== savedSearchName
            );
            expect(clonedTitles).toHaveLength(1);
            const [clonedTitle] = clonedTitles;
            await dashboard.expectLinkedToLibrary(savedSearchName);
            await dashboard.expectNotLinkedToLibrary(clonedTitle);
          }
        });
      });
    }

    for (const { testName, ignoreUnmappedFilters } of [
      { testName: 'keeps a custom filter after reload', ignoreUnmappedFilters: false },
      {
        testName: 'keeps a custom filter after reload when ignoring unmapped fields',
        ignoreUnmappedFilters: true,
      },
    ]) {
      spaceTest(testName, async ({ apiServices, page, pageObjects, scoutSpace }) => {
        const { dashboard, dataGrid, discover, filterBar } = pageObjects;
        const savedSearchName = `Inline DSL filter ${ignoreUnmappedFilters} ${scoutSpace.id}`;
        const grid = dashboard.getPanelHoverActionsLocator(savedSearchName).getByRole('grid');
        const bytesCell = dataGrid.getCellValue(0, 'bytes');

        const { bytesText, bytesValue, unfilteredRowCount } = await spaceTest.step(
          'load an inline panel with the selected filter setting',
          async () => {
            await scoutSpace.uiSettings.set({ [IGNORE_FILTER_SETTING]: ignoreUnmappedFilters });
            await createInlineSession(apiServices, scoutSpace.id, savedSearchName);
            await dashboard.openNewDashboard();
            await dashboard.addSavedSearch(savedSearchName);
            await dashboard.waitForPanelsToLoad(1);

            await expect(bytesCell).toHaveText(/^\s*\d[\d,]*\s*$/);
            const cellText = (await bytesCell.innerText()).trim();
            const cellValue = Number(cellText.replace(/,/g, ''));
            expect(cellValue).toBeGreaterThan(0);
            await expect(grid).toHaveAttribute('aria-rowcount', /^[1-9]\d*$/);
            return {
              bytesText: cellText,
              bytesValue: cellValue,
              unfilteredRowCount: await getGridRowCount(grid),
            };
          }
        );

        const queryDsl = { term: { bytes: bytesValue } };
        const expectDslFilterEditor = async () => {
          await expect(page.getByRole('dialog').getByTestId('kibanaCodeEditor')).toBeVisible();
          await expect
            .poll(async () =>
              JSON.parse(await discover.codeEditor.getCodeEditorValueByTestSubj('kibanaCodeEditor'))
            )
            .toStrictEqual(queryDsl);
          await expect(page.testSubj.locator('saveFilter')).toBeEnabled();
        };

        const filteredRowCount = await spaceTest.step(
          'apply and inspect the DSL filter',
          async () => {
            await filterBar.addDslFilter(JSON.stringify(queryDsl));
            await expect.poll(() => filterBar.getFilterCount()).toBe(1);
            await expect.poll(() => getGridRowCount(grid)).toBeLessThan(unfilteredRowCount);
            const rowCount = await getGridRowCount(grid);
            expect(rowCount).toBeGreaterThan(0);

            await filterBar.clickEditFilterById('0');
            await expectDslFilterEditor();
            await filterBar.closeFieldEditorModal();
            return rowCount;
          }
        );

        await spaceTest.step('save and reload without losing the filter', async () => {
          await dashboard.saveDashboard(savedSearchName);
          await page.reload();
          await dashboard.waitForPanelsToLoad(1);

          await expect(grid).toHaveAttribute('aria-rowcount', String(filteredRowCount));
          await expect(bytesCell).toHaveText(bytesText);
          await expect.poll(() => filterBar.getFilterCount()).toBe(1);
          await filterBar.clickEditFilterById('0');
          await expectDslFilterEditor();
          await filterBar.closeFieldEditorModal();
          await expect(page.testSubj.locator('embeddableError')).toHaveCount(0);
          await expect(page.testSubj.locator('dashboardQuickSaveMenuItem')).toBeVisible();
          await expect(dashboard.unsavedChangesIndicator).toBeHidden();
        });
      });
    }

  }
);
