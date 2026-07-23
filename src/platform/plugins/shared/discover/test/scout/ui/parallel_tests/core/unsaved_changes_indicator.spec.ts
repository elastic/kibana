/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { VIEW_MODE } from '../../../../../common/constants';
import { spaceTest, tags, testData, type DiscoverScoutSpace } from '../../fixtures/common';

const SAVED_SEARCH_NAME = 'test saved search';
const SAVED_SEARCH_WITH_FILTERS_NAME = 'test saved search with filters';
const CUSTOM_SAMPLE_SIZE = 250;

const createSavedSearch = async (
  discoverScoutSpace: DiscoverScoutSpace,
  savedSearchName: string,
  columnOrder: string[] = []
) => {
  await discoverScoutSpace.createDiscoverSession({
    title: savedSearchName,
    tabs: [
      {
        id: 'persisted-data-view',
        label: testData.DEFAULT_DATA_VIEW,
        data_source: {
          type: 'data_view_reference',
          ref_id: discoverScoutSpace.getDataViewId(testData.DEFAULT_DATA_VIEW),
        },
        column_order: columnOrder,
        sort: [{ name: '@timestamp', direction: 'desc' }],
        query: { language: 'kql', expression: '' },
        filters: [],
        view_mode: VIEW_MODE.DOCUMENT_LEVEL,
        hide_chart: false,
        hide_table: false,
        time_restore: false,
      },
    ],
  });
};

spaceTest.describe('Discover unsaved changes indicator', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest(
    'should not show the indicator initially nor after changes to a draft saved search',
    async ({ pageObjects }) => {
      await expect(pageObjects.discover.unsavedChangesIndicator()).toBeHidden();

      await pageObjects.unifiedFieldList.clickFieldListItemAdd('bytes');

      await expect(pageObjects.discover.unsavedChangesIndicator()).toBeHidden();
    }
  );

  spaceTest(
    'should show the indicator only after changes to a persisted saved search',
    async ({ pageObjects }) => {
      await pageObjects.discover.saveSearch(SAVED_SEARCH_NAME);

      await expect(pageObjects.discover.unsavedChangesIndicator()).toBeHidden();

      await pageObjects.unifiedFieldList.clickFieldListItemAdd('bytes');

      await expect(pageObjects.discover.unsavedChangesIndicator()).toBeVisible();

      await pageObjects.discover.saveUnsavedChanges();

      await expect(pageObjects.discover.unsavedChangesIndicator()).toBeHidden();
    }
  );

  spaceTest(
    'should not show the indicator after loading a saved search, only after changes',
    async ({ discoverScoutSpace, pageObjects }) => {
      const savedSearchName = 'test saved search for breakdown';
      await createSavedSearch(discoverScoutSpace, savedSearchName);
      await pageObjects.discover.loadSavedSearch(savedSearchName);

      await expect(pageObjects.discover.unsavedChangesIndicator()).toBeHidden();

      await pageObjects.discover.chooseBreakdownField('_index');

      await expect(pageObjects.discover.unsavedChangesIndicator()).toBeVisible();
    }
  );

  spaceTest(
    'should not show the indicator after loading an ES|QL saved search, only after changes',
    async ({ pageObjects }) => {
      await pageObjects.discover.loadSavedSearch('ES|QL Discover Session');

      await expect(pageObjects.discover.unsavedChangesIndicator()).toBeHidden();

      await pageObjects.discover.codeEditor.setCodeEditorValue('from logstash-* | limit 100');
      await pageObjects.discover.submitQuery();

      await expect(pageObjects.discover.unsavedChangesIndicator()).toBeVisible();
    }
  );

  spaceTest('should allow reverting changes', async ({ discoverScoutSpace, page, pageObjects }) => {
    const savedSearchName = 'test saved search for revert';

    await spaceTest.step('load a persisted saved search', async () => {
      await createSavedSearch(discoverScoutSpace, savedSearchName, ['bytes']);
      await pageObjects.discover.loadSavedSearch(savedSearchName);

      await expect(pageObjects.discover.unsavedChangesIndicator()).toBeHidden();
    });

    await spaceTest.step('revert column changes', async () => {
      expect(await pageObjects.dataGrid.getColumnTitles()).toStrictEqual(['@timestamp', 'bytes']);
      await pageObjects.dataGrid.addFieldFromSidebar('extension');

      expect(await pageObjects.dataGrid.getColumnTitles()).toStrictEqual([
        '@timestamp',
        'bytes',
        'extension',
      ]);
      await expect(pageObjects.discover.unsavedChangesIndicator()).toBeVisible();

      await pageObjects.discover.revertUnsavedChanges();
      expect(await pageObjects.dataGrid.getColumnTitles()).toStrictEqual(['@timestamp', 'bytes']);
      await expect(pageObjects.discover.unsavedChangesIndicator()).toBeHidden();
    });

    await spaceTest.step('revert sample size changes', async () => {
      await pageObjects.dataGrid.openGridDisplaySettings();
      expect(await pageObjects.dataGrid.getCurrentSampleSize()).toBe(testData.DEFAULT_SAMPLE_SIZE);
      await pageObjects.dataGrid.setSampleSize(CUSTOM_SAMPLE_SIZE);
      await expect(pageObjects.discover.unsavedChangesIndicator()).toBeVisible();

      await pageObjects.discover.revertUnsavedChanges();
      await expect(pageObjects.discover.unsavedChangesIndicator()).toBeHidden();
      await pageObjects.dataGrid.openGridDisplaySettings();
      expect(await pageObjects.dataGrid.getCurrentSampleSize()).toBe(testData.DEFAULT_SAMPLE_SIZE);
      await page.keyboard.press('Escape');
    });
  });

  spaceTest(
    'should hide the indicator once user manually reverts changes',
    async ({ discoverScoutSpace, pageObjects }) => {
      const savedSearchName = 'test saved search for manual revert';

      await spaceTest.step('load a persisted saved search', async () => {
        await createSavedSearch(discoverScoutSpace, savedSearchName, ['bytes']);
        await pageObjects.discover.loadSavedSearch(savedSearchName);
        await pageObjects.discover.waitUntilTabIsLoaded();

        await expect(pageObjects.discover.unsavedChangesIndicator()).toBeHidden();
      });

      await spaceTest.step('manually revert column changes', async () => {
        await expect(pageObjects.dataGrid.getColumnHeader('bytes')).toBeVisible();
        expect(await pageObjects.dataGrid.getColumnTitles()).toStrictEqual(['@timestamp', 'bytes']);
        await pageObjects.dataGrid.addFieldFromSidebar('extension');

        expect(await pageObjects.dataGrid.getColumnTitles()).toStrictEqual([
          '@timestamp',
          'bytes',
          'extension',
        ]);
        await expect(pageObjects.discover.unsavedChangesIndicator()).toBeVisible();

        await pageObjects.unifiedFieldList.clickFieldListItemRemove('extension');

        await pageObjects.dataGrid.waitForLoad();
        await expect(pageObjects.dataGrid.getColumnHeader('extension')).toBeHidden();
        expect(await pageObjects.dataGrid.getColumnTitles()).toStrictEqual(['@timestamp', 'bytes']);
        await expect(pageObjects.discover.unsavedChangesIndicator()).toBeHidden();
      });

      await spaceTest.step('manually revert breakdown field changes', async () => {
        await pageObjects.discover.chooseBreakdownField('_index');
        await pageObjects.dataGrid.waitForLoad();
        await expect(pageObjects.discover.unsavedChangesIndicator()).toBeVisible();

        await pageObjects.discover.clearBreakdownField();
        await pageObjects.dataGrid.waitForLoad();
        await expect(pageObjects.discover.unsavedChangesIndicator()).toBeHidden();
      });
    }
  );

  spaceTest(
    'should not show the indicator after pinning a filter, but should appear after disabling a filter',
    async ({ pageObjects }) => {
      await spaceTest.step('save a search with filters', async () => {
        await pageObjects.filterBar.addFilter({
          field: 'extension',
          operator: 'is',
          value: 'png',
        });
        await pageObjects.filterBar.addFilter({ field: 'bytes', operator: 'exists' });
        await pageObjects.discover.saveSearch(SAVED_SEARCH_WITH_FILTERS_NAME);

        await expect(pageObjects.discover.unsavedChangesIndicator()).toBeHidden();
      });

      await spaceTest.step('pinning a filter does not show the indicator', async () => {
        await pageObjects.filterBar.toggleFilterPinned('extension');

        await expect(pageObjects.discover.unsavedChangesIndicator()).toBeHidden();
      });

      await spaceTest.step(
        'disabling a filter shows the indicator and can be reverted',
        async () => {
          await pageObjects.filterBar.toggleFilterNegated('bytes');

          await expect(pageObjects.discover.unsavedChangesIndicator()).toBeVisible();

          await pageObjects.discover.revertUnsavedChanges();
          await expect(pageObjects.discover.unsavedChangesIndicator()).toBeHidden();

          expect(await pageObjects.filterBar.getFilterCount()).toBe(2);
          expect(await pageObjects.discover.getHitCountInt()).toBe(1373);
        }
      );
    }
  );
});
