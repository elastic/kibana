/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", or the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

const RUNTIME_FIELD_SCRIPT = "emit('abc')";

spaceTest.describe('Discover runtime field editor CRUD', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeEach(async ({ browserAuth, discoverScoutSpace, pageObjects }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterEach(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest('creates a runtime field', async ({ pageObjects }) => {
    const { discover, unifiedFieldList } = pageObjects;
    const fieldName = '_runtimefield';

    await discover.createRuntimeField(fieldName, RUNTIME_FIELD_SCRIPT);
    await unifiedFieldList.searchField(fieldName);

    await expect(unifiedFieldList.getAvailableField(fieldName)).toBeVisible();
  });

  spaceTest('renames a newly created runtime field', async ({ pageObjects }) => {
    const { discover, unifiedFieldList } = pageObjects;
    const fieldName = '_runtimefield_before_edit';
    const newFieldName = '_runtimefield_after_edit';

    await discover.createRuntimeField(fieldName, RUNTIME_FIELD_SCRIPT);
    await unifiedFieldList.openFieldEditor(fieldName);
    await discover.renameRuntimeField(newFieldName);

    await unifiedFieldList.searchField(newFieldName);
    await expect(unifiedFieldList.getAvailableField(newFieldName)).toBeVisible();
    await unifiedFieldList.searchField(fieldName);
    await expect(unifiedFieldList.getAvailableField(fieldName)).toBeHidden();
  });

  spaceTest('persists a runtime field in a saved search', async ({ pageObjects }) => {
    const { discover, unifiedFieldList } = pageObjects;
    const fieldName = '_runtimefield_saved_search';
    const savedSearchName = `Saved Search with runtime field ${Date.now()}`;

    await discover.createRuntimeField(fieldName, RUNTIME_FIELD_SCRIPT);
    await unifiedFieldList.clickFieldListItemAdd(fieldName);
    expect(await discover.getDocHeader()).toContain(fieldName);

    await discover.saveSearch(savedSearchName);
    await discover.waitUntilSearchingHasFinished();

    await discover.clickNewSearch();
    await discover.loadSavedSearch(savedSearchName);

    expect(await discover.getDocHeader()).toContain(fieldName);
  });

  spaceTest('deletes a runtime field', async ({ pageObjects }) => {
    const { discover, unifiedFieldList } = pageObjects;
    const fieldName = '_runtimefield_to_delete';

    await discover.createRuntimeField(fieldName, RUNTIME_FIELD_SCRIPT);
    await discover.deleteRuntimeField(fieldName);

    await unifiedFieldList.searchField(fieldName);
    await expect(unifiedFieldList.getAvailableField(fieldName)).toBeHidden();
  });

  spaceTest('shows runtime fields in the document viewer', async ({ page, pageObjects }) => {
    const { discover, docViewer } = pageObjects;
    const fieldName = '_runtimefield_doc_view';

    await discover.createRuntimeField(fieldName, RUNTIME_FIELD_SCRIPT);
    await docViewer.openAndWaitForFlyout({ rowIndex: 0 });
    await docViewer.openTab('doc_view_table');

    await expect(page.testSubj.locator(`tableDocViewRow-${fieldName}-value`)).toBeVisible();
  });
});
