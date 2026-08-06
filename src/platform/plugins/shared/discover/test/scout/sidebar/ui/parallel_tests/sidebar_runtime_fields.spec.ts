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

/**
 * Runtime field CRUD needs an ad-hoc data view: Security editor has Discover but
 * not `indexPatterns`, so "Add a field" is hidden on persisted data views.
 * Create the session via API (`data_view_spec`) instead of the data-view UI.
 */
spaceTest.describe('Discover sidebar runtime fields', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeEach(async ({ browserAuth, discoverScoutSpace, pageObjects }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
    await browserAuth.loginAsPrivilegedUser();

    const sessionId = await discoverScoutSpace.createDiscoverSession({
      title: `sidebar-runtime-fields-${discoverScoutSpace.id}`,
      tabs: [
        {
          id: 'main',
          label: 'Untitled',
          data_source: {
            type: 'data_view_spec',
            index_pattern: testData.DEFAULT_DATA_VIEW,
            time_field: '@timestamp',
          },
        },
      ],
    });

    await pageObjects.discover.goto({ queryMode: 'classic', savedSearchId: sessionId });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterEach(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest(
    'supports ad-hoc data views with runtime field create, relabel, and remove',
    async ({ pageObjects }) => {
      const { discover, unifiedFieldList } = pageObjects;
      const fieldName = '_bytes-runtimefield';
      const labeledName = '_bytes-runtimefield2';

      const baselineCount = await unifiedFieldList.getAvailableFieldCount();
      expect(baselineCount).toBeGreaterThan(0);

      await discover.createRuntimeField(fieldName, `emit((doc["bytes"].value * 2).toString())`);
      await unifiedFieldList.expectAvailableFieldCount(baselineCount + 1);
      await unifiedFieldList.searchField(fieldName);
      await expect(unifiedFieldList.getAvailableField(fieldName)).toBeVisible();

      await unifiedFieldList.openFieldEditor(fieldName);
      await discover.setCustomLabel(labeledName, { enableToggle: true });
      await discover.saveOpenFieldEditor();

      await unifiedFieldList.searchField(labeledName);
      await expect(unifiedFieldList.getAvailableField(fieldName)).toBeVisible();
      expect(await unifiedFieldList.getAllFieldNames()).toContain(labeledName);
      expect(await unifiedFieldList.getAllFieldNames()).not.toContain(fieldName);

      await discover.deleteRuntimeField(fieldName);
      await unifiedFieldList.clearFieldSearch();
      await unifiedFieldList.expectAvailableFieldCount(baselineCount);
      await unifiedFieldList.searchField(fieldName);
      await expect(unifiedFieldList.getAvailableField(fieldName)).toBeHidden();
    }
  );

  spaceTest(
    'keeps the sidebar rendered when document retrieval fails',
    async ({ page, pageObjects }) => {
      const { discover, unifiedFieldList } = pageObjects;
      const invalidField = '_invalid-runtimefield';
      const baselineCount = await unifiedFieldList.getAvailableFieldCount();

      // Curly quotes make this an invalid Painless script (matches FTR).
      await discover.createRuntimeField(invalidField, 'emit(\u2018\u2019);');
      await expect(discover.getErrorCalloutTitle()).toBeVisible();

      await unifiedFieldList.expectAvailableFieldCount(baselineCount + 1);
      await unifiedFieldList.searchField(invalidField);
      await expect(unifiedFieldList.getAvailableField(invalidField)).toBeVisible();

      await page.reload();
      await discover.waitUntilTabIsLoaded();
      await expect(discover.getErrorCalloutTitle()).toBeVisible();
      await unifiedFieldList.searchField(invalidField);
      await expect(unifiedFieldList.getAvailableField(invalidField)).toBeVisible();

      await discover.deleteRuntimeField(invalidField);
      await discover.waitUntilSearchingHasFinished();
    }
  );

  spaceTest(
    'removes the data grid column after a runtime field is deleted',
    async ({ pageObjects }) => {
      const { discover, unifiedFieldList } = pageObjects;
      const newField = '_test_field_and_column_removal';
      const baselineCount = await unifiedFieldList.getAvailableFieldCount();

      await discover.createRuntimeField(newField, 'emit("hi there")');
      await unifiedFieldList.expectAvailableFieldCount(baselineCount + 1);

      expect(await unifiedFieldList.isFieldSelected(newField)).toBe(false);
      expect(await discover.getDocHeader()).toStrictEqual(['@timestamp', 'Summary']);

      await unifiedFieldList.clickFieldListItemAdd(newField);
      await discover.waitUntilSearchingHasFinished();
      expect(await unifiedFieldList.isFieldSelected(newField)).toBe(true);
      expect(await discover.getDocHeader()).toStrictEqual(['@timestamp', newField]);

      await discover.deleteRuntimeField(newField);
      await unifiedFieldList.searchField(newField);
      await expect(unifiedFieldList.getAvailableField(newField)).toBeHidden();
      expect(await discover.getDocHeader()).toStrictEqual(['@timestamp', 'Summary']);
    }
  );
});
