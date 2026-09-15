/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import type { DiscoverSessionApiDataInput } from '../../../../../server/api/schema';
import { spaceTest, tags } from '../fixtures';

const getGridRowCount = async (grid: Locator) =>
  Number.parseInt((await grid.getAttribute('aria-rowcount')) ?? '', 10);

spaceTest.describe('Discover — adhoc data views', { tag: tags.deploymentAgnostic }, () => {
  const inlineRuntimeSessionIds: string[] = [];

  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterEach(async ({ kbnClient, discoverScoutSpace }) => {
    for (const id of inlineRuntimeSessionIds.splice(0)) {
      await kbnClient.savedObjects.delete({ type: 'search', id, space: discoverScoutSpace.id });
    }
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest(
    'adding a runtime field to an ad hoc data view changes the data view ID',
    async ({ apiServices, discoverScoutSpace, pageObjects }) => {
      const { discover, unifiedFieldList } = pageObjects;

      await apiServices.discover.create(
        {
          title: 'logstash-adhoc',
          tabs: [
            {
              id: 'main',
              label: 'Untitled',
              data_source: {
                type: 'data_view_spec',
                index_pattern: 'logstash*',
                time_field: '@timestamp',
              },
            },
          ],
        } satisfies DiscoverSessionApiDataInput,
        discoverScoutSpace.id
      );
      await discover.loadSavedSearch('logstash-adhoc');
      const firstId = await discover.getCurrentDataViewId();

      await discover.createRuntimeField({
        fieldName: '_bytes-runtimefield',
        script: `emit(doc["bytes"].value.toString())`,
      });
      await unifiedFieldList.clickFieldListItemAdd('_bytes-runtimefield');

      const secondId = await discover.getCurrentDataViewId();
      expect(firstId).not.toBe(secondId);
    }
  );

  spaceTest(
    'navigates to surrounding docs view and back, preserving the ad hoc data view',
    async ({ apiServices, discoverScoutSpace, page, pageObjects }) => {
      const { discover, dataGrid } = pageObjects;

      await apiServices.discover.create(
        {
          title: 'logstash-adhoc-surrounding',
          tabs: [
            {
              id: 'main',
              label: 'Untitled',
              data_source: {
                type: 'data_view_spec',
                index_pattern: 'logstash*',
                time_field: '@timestamp',
                field_settings: {
                  '_bytes-runtimefield': {
                    type: 'keyword',
                    script: 'emit(doc["bytes"].value.toString())',
                  },
                },
              },
              column_order: ['_bytes-runtimefield'],
            },
          ],
        } satisfies DiscoverSessionApiDataInput,
        discoverScoutSpace.id
      );
      await discover.loadSavedSearch('logstash-adhoc-surrounding');

      await dataGrid.openDocumentDetails({ rowIndex: 0 });
      const actions = await dataGrid.getRowActions();
      // Actions are: [0] View single document, [1] View surrounding documents
      await actions[1].click();

      // context page can take longer to hydrate after navigating from surrounding-docs action
      await page.testSubj
        .locator('discoverContextAppTitle')
        .waitFor({ state: 'visible', timeout: 30_000 });

      await page.testSubj.locator('appHeaderBack').click();
      await discover.waitUntilTabIsLoaded();
      expect(await discover.getSelectedDataViewName()).toBe('logstash*');
    }
  );

  spaceTest(
    'navigates to single doc view and back, preserving the ad hoc data view',
    async ({ apiServices, discoverScoutSpace, page, pageObjects }) => {
      const { discover, dataGrid } = pageObjects;

      await apiServices.discover.create(
        {
          title: 'logstash-adhoc-single-doc',
          tabs: [
            {
              id: 'main',
              label: 'Untitled',
              data_source: {
                type: 'data_view_spec',
                index_pattern: 'logstash*',
                time_field: '@timestamp',
                field_settings: {
                  '_bytes-runtimefield': {
                    type: 'keyword',
                    script: 'emit(doc["bytes"].value.toString())',
                  },
                },
              },
              column_order: ['_bytes-runtimefield'],
            },
          ],
        } satisfies DiscoverSessionApiDataInput,
        discoverScoutSpace.id
      );
      await discover.loadSavedSearch('logstash-adhoc-single-doc');

      await dataGrid.openDocumentDetails({ rowIndex: 0 });
      const actions = await dataGrid.getRowActions();
      // Actions are: [0] View single document, [1] View surrounding documents
      await actions[0].click();

      // single-doc page can take longer to hydrate after navigating from the row action
      await page.testSubj
        .locator('discoverSingleDocTitle')
        .waitFor({ state: 'visible', timeout: 30_000 });

      await page.testSubj.locator('appHeaderBack').click();
      await discover.waitUntilTabIsLoaded();
      expect(await discover.getSelectedDataViewName()).toBe('logstash*');
    }
  );

  spaceTest(
    'saving preserves the data view ID but saving as copy generates a new data view ID',
    async ({ apiServices, discoverScoutSpace, pageObjects }) => {
      const { discover } = pageObjects;

      await apiServices.discover.create(
        {
          title: 'logstash-adhoc-save',
          tabs: [
            {
              id: 'main',
              label: 'Untitled',
              data_source: {
                type: 'data_view_spec',
                index_pattern: 'logstash*',
                time_field: '@timestamp',
                field_settings: {
                  '_bytes-runtimefield': {
                    type: 'keyword',
                    script: 'emit(doc["bytes"].value.toString())',
                  },
                },
              },
              column_order: ['_bytes-runtimefield'],
            },
          ],
        } satisfies DiscoverSessionApiDataInput,
        discoverScoutSpace.id
      );
      await discover.loadSavedSearch('logstash-adhoc-save');

      const idBeforeSave = await discover.getCurrentDataViewId();
      await discover.saveSearch('logstash*-ss');
      await discover.waitUntilTabIsLoaded();
      expect(await discover.getCurrentDataViewId()).toBe(idBeforeSave);

      const idBeforeCopy = await discover.getCurrentDataViewId();
      await discover.saveSearchAsNew('logstash*-ss-new');
      await discover.waitUntilTabIsLoaded();
      expect(await discover.getCurrentDataViewId()).not.toBe(idBeforeCopy);
    }
  );

  spaceTest(
    'search results differ between original and updated runtime field definitions on dashboard',
    async ({ apiServices, discoverScoutSpace, pageObjects }) => {
      const { dataGrid, dashboard } = pageObjects;

      await spaceTest.step(
        'creates ad hoc data view with runtime field and saves search',
        async () => {
          await apiServices.discover.create(
            {
              title: 'logst*-ss-_bytes-runtimefield',
              tabs: [
                {
                  id: 'main',
                  label: 'Untitled',
                  data_source: {
                    type: 'data_view_spec',
                    index_pattern: 'logst*',
                    time_field: '@timestamp',
                    field_settings: {
                      '_bytes-runtimefield': {
                        type: 'keyword',
                        script: 'emit(doc["bytes"].value.toString())',
                      },
                    },
                  },
                  column_order: ['_bytes-runtimefield'],
                },
              ],
            } satisfies DiscoverSessionApiDataInput,
            discoverScoutSpace.id
          );
        }
      );

      await spaceTest.step(
        'creates updated saved search with 2× runtime field via API',
        async () => {
          await apiServices.discover.create(
            {
              title: 'logst*-ss-_bytes-runtimefield-updated',
              tabs: [
                {
                  id: 'main',
                  label: 'Untitled',
                  data_source: {
                    type: 'data_view_spec',
                    index_pattern: 'logst*',
                    time_field: '@timestamp',
                    field_settings: {
                      '_bytes-runtimefield': {
                        type: 'keyword',
                        script: 'emit((doc["bytes"].value * 2).toString())',
                      },
                    },
                  },
                  column_order: ['_bytes-runtimefield'],
                },
              ],
            } satisfies DiscoverSessionApiDataInput,
            discoverScoutSpace.id
          );
        }
      );

      await spaceTest.step(
        'adds both saved searches to a dashboard and compares cell values',
        async () => {
          await dashboard.goto();
          await dashboard.openNewDashboard();

          await dashboard.addSavedSearch('logst*-ss-_bytes-runtimefield');
          await dashboard.addSavedSearch('logst*-ss-_bytes-runtimefield-updated');

          const cellLocator = dataGrid.getCellsAtVisibleRowIndex('_bytes-runtimefield', 0);
          await expect(cellLocator).toHaveCount(2);
          const cells = await cellLocator.all();
          const first = parseFloat((await cells[0].innerText()).replace(/,/g, ''));
          const second = parseFloat((await cells[1].innerText()).replace(/,/g, ''));
          expect(second).toBe(first * 2);
        }
      );
    }
  );

  spaceTest(
    'keeps same-named inline views with different runtime scripts separate after reload',
    async ({ apiServices, discoverScoutSpace, page, pageObjects }) => {
      const { dataGrid, dashboard, filterBar } = pageObjects;
      const originalTitle = `Inline runtime field original ${discoverScoutSpace.id}`;
      const updatedTitle = `Inline runtime field doubled ${discoverScoutSpace.id}`;

      await spaceTest.step(
        'create two same-named views with different runtime scripts',
        async () => {
          for (const { title, script } of [
            { title: originalTitle, script: 'emit(doc["bytes"].value.toString())' },
            { title: updatedTitle, script: 'emit((doc["bytes"].value * 2).toString())' },
          ]) {
            const sessionId = await apiServices.discover.create(
              {
                title,
                tabs: [
                  {
                    id: 'main',
                    label: 'Untitled',
                    data_source: {
                      type: 'data_view_spec',
                      index_pattern: 'logst*',
                      name: 'Inline logs',
                      time_field: '@timestamp',
                      field_settings: {
                        '_bytes-runtimefield': { type: 'keyword', script },
                      },
                    },
                    column_order: ['bytes', '_bytes-runtimefield'],
                    query: { language: 'kql', expression: 'bytes > 0' },
                    sort: [{ name: '@timestamp', direction: 'desc' }],
                  },
                ],
              },
              discoverScoutSpace.id
            );
            inlineRuntimeSessionIds.push(sessionId);
          }
        }
      );

      const originalPanel = dashboard.getPanelHoverActionsLocator(originalTitle);
      const updatedPanel = dashboard.getPanelHoverActionsLocator(updatedTitle);
      const runtimeCell = dataGrid.getCellValue(0, '_bytes-runtimefield');
      const originalCell = originalPanel.locator(runtimeCell);
      const updatedCell = updatedPanel.locator(runtimeCell);
      const originalGrid = originalPanel.getByRole('grid');
      const updatedGrid = updatedPanel.getByRole('grid');

      const { originalValue, filteredRowCount } = await spaceTest.step(
        'add the original panel and filter on a mapped field',
        async () => {
          await dashboard.openNewDashboard();
          await dashboard.addSavedSearch(originalTitle);
          await dashboard.waitForPanelsToLoad(1);

          await expect(originalCell).toHaveText(/^\s*\d[\d,]*\s*$/);
          const cellValue = Number((await originalCell.innerText()).replace(/,/g, '').trim());
          expect(cellValue).toBeGreaterThan(0);
          await expect(originalGrid).toHaveAttribute('aria-rowcount', /^[1-9]\d*$/);
          const unfilteredRowCount = await getGridRowCount(originalGrid);

          await dataGrid.filterCell({ rowIndex: 0, columnId: 'bytes', mode: 'for' });
          await expect.poll(() => filterBar.getFilterCount()).toBe(1);
          await expect.poll(() => getGridRowCount(originalGrid)).toBeLessThan(unfilteredRowCount);
          const rowCount = await getGridRowCount(originalGrid);
          expect(rowCount).toBeGreaterThan(0);
          return { originalValue: cellValue, filteredRowCount: rowCount };
        }
      );

      const expectPanelResults = async () => {
        await expect(originalCell).toHaveText(String(originalValue));
        await expect(updatedCell).toHaveText(String(originalValue * 2));
        await expect(originalGrid).toHaveAttribute('aria-rowcount', String(filteredRowCount));
        await expect(updatedGrid).toHaveAttribute('aria-rowcount', String(filteredRowCount));
        await expect.poll(() => filterBar.getFilterCount()).toBe(1);
        await expect(page.testSubj.locator('embeddableError')).toHaveCount(0);
      };

      const expectFilterEditor = async () => {
        await expect
          .poll(() => page.components.comboBox('filterFieldSuggestionList').getSelectedOptions())
          .toStrictEqual(['bytes']);
        await expect(page.testSubj.locator('filterParams').getByRole('spinbutton')).toHaveValue(
          String(originalValue)
        );
        await expect(page.testSubj.locator('saveFilter')).toBeEnabled();
        await expect
          .poll(() => page.components.comboBox('filterIndexPatternsSelect').getSelectedOptions())
          .toStrictEqual(['Inline logs']);
      };

      await spaceTest.step(
        'add the different spec without changing either panel result',
        async () => {
          await dashboard.addSavedSearch(updatedTitle);
          await dashboard.waitForPanelsToLoad(2);
          await expectPanelResults();
          await filterBar.clickEditFilterById('0');
          await expectFilterEditor();
          await filterBar.closeFieldEditorModal();
        }
      );

      await spaceTest.step('keep both results and the filter editable after reload', async () => {
        await dashboard.saveDashboard('Different inline runtime fields');
        await page.reload();
        await dashboard.waitForPanelsToLoad(2);
        await expectPanelResults();
        await filterBar.clickEditFilterById('0');
        await expectFilterEditor();
        await filterBar.closeFieldEditorModal();
        await expect(page.testSubj.locator('dashboardQuickSaveMenuItem')).toBeVisible();
        await expect(dashboard.unsavedChangesIndicator).toBeHidden();
      });
    }
  );

  spaceTest(
    'editing a runtime field via the column menu changes the data view ID',
    async ({ apiServices, discoverScoutSpace, page, pageObjects }) => {
      const { discover, dataGrid } = pageObjects;

      await apiServices.discover.create(
        {
          title: 'logst-runtimefield-edit',
          tabs: [
            {
              id: 'main',
              label: 'Untitled',
              data_source: {
                type: 'data_view_spec',
                index_pattern: 'logst*',
                time_field: '@timestamp',
                field_settings: {
                  '_bytes-runtimefield': {
                    type: 'keyword',
                    script: 'emit(doc["bytes"].value.toString())',
                  },
                },
              },
              column_order: ['_bytes-runtimefield'],
            },
          ],
        } satisfies DiscoverSessionApiDataInput,
        discoverScoutSpace.id
      );
      await discover.loadSavedSearch('logst-runtimefield-edit');
      await discover.waitUntilTabIsLoaded();

      const prevId = await discover.getCurrentDataViewId();

      await dataGrid.openColumnMenuByField('_bytes-runtimefield');
      await page.testSubj.click('gridEditFieldButton');

      await page
        .getByRole('dialog', { name: /Edit .* field/ })
        .getByRole('textbox', { name: 'Name field' })
        .fill('_bytes-runtimefield-edited');
      await discover.saveOpenFieldEditor({ confirmChange: true });

      const newId = await discover.getCurrentDataViewId();
      expect(newId).not.toBe(prevId);
    }
  );
});
