/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, tags, testData } from '../fixtures';

spaceTest.describe('Discover inline data view editing', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeEach(async ({ apiServices, browserAuth, discoverScoutSpace, pageObjects }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
    const sessionId = await apiServices.discover.create(
      {
        title: `Inline editing ${discoverScoutSpace.id}`,
        tabs: [
          {
            id: 'main',
            label: 'Untitled',
            data_source: {
              type: 'data_view_spec',
              name: 'Inline editing',
              index_pattern: testData.DEFAULT_DATA_VIEW,
              time_field: '@timestamp',
              field_settings: {
                inline_runtime: { type: 'keyword', script: 'emit("original")' },
              },
            },
          },
        ],
      },
      discoverScoutSpace.id
    );
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'classic', savedSearchId: sessionId });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterEach(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest(
    'discards field edits without changing the shared inline view',
    async ({ pageObjects }) => {
      const { discover, unifiedFieldList, unifiedTabs } = pageObjects;
      const originalId = await discover.getCurrentDataViewId();

      await unifiedTabs.duplicateTab(0);
      await discover.waitUntilTabIsLoaded();
      await discover.saveUnsavedChanges();
      await expect(discover.unsavedChangesIndicator()).toBeHidden();

      await unifiedFieldList.openFieldEditor('inline_runtime');
      await discover.setCustomLabel('Discarded label', { enableToggle: true });
      await discover.discardOpenFieldEditorChanges();

      await expect.poll(() => discover.getCurrentDataViewId()).toBe(originalId);
      await expect(discover.unsavedChangesIndicator()).toBeHidden();
      await unifiedFieldList.searchField('inline_runtime');
      await expect(unifiedFieldList.getAvailableField('inline_runtime')).toBeVisible();
      await expect(unifiedFieldList.getAvailableField('inline_runtime')).not.toContainText(
        'Discarded label'
      );

      await unifiedTabs.selectTab(0);
      await discover.waitUntilTabIsLoaded();
      await expect.poll(() => discover.getCurrentDataViewId()).toBe(originalId);
      await unifiedFieldList.searchField('inline_runtime');
      await expect(unifiedFieldList.getAvailableField('inline_runtime')).toBeVisible();
      await expect(unifiedFieldList.getAvailableField('inline_runtime')).not.toContainText(
        'Discarded label'
      );
      await expect(discover.unsavedChangesIndicator()).toBeHidden();
    }
  );

  spaceTest(
    'keeps filters editable after changing the view and saving',
    async ({ page, pageObjects }) => {
      const { discover, filterBar, unifiedFieldList } = pageObjects;
      await filterBar.addFilter({ field: 'extension.raw', operator: 'is', value: 'css' });
      await discover.waitUntilSearchingHasFinished();
      const originalId = await discover.getCurrentDataViewId();

      await discover.createRuntimeField({ fieldName: 'additional_field', script: 'emit("added")' });
      await expect.poll(() => discover.getCurrentDataViewId()).not.toBe(originalId);
      const editedId = await discover.getCurrentDataViewId();
      await filterBar.clickEditFilter('extension.raw', 'css');
      await expect.poll(() => filterBar.getFilterEditorSelectedPhrases()).toStrictEqual(['css']);
      await expect(page.testSubj.locator('saveFilter')).toBeEnabled();
      await filterBar.closeFieldEditorModal();

      await discover.saveUnsavedChanges();
      await expect(discover.unsavedChangesIndicator()).toBeHidden();
      await page.reload();
      await discover.waitUntilTabIsLoaded();

      await expect.poll(() => discover.getCurrentDataViewId()).toBe(editedId);
      await expect(discover.unsavedChangesIndicator()).toBeHidden();
      await unifiedFieldList.searchField('additional_field');
      await expect(unifiedFieldList.getAvailableField('additional_field')).toBeVisible();
      await filterBar.clickEditFilter('extension.raw', 'css');
      await expect.poll(() => filterBar.getFilterEditorSelectedPhrases()).toStrictEqual(['css']);
      await expect(page.testSubj.locator('saveFilter')).toBeEnabled();
      await filterBar.closeFieldEditorModal();
    }
  );
});
