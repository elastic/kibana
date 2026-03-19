/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, testData } from '../fixtures';

test.describe('Saved Objects Management - inspect view', { tag: tags.deploymentAgnostic }, () => {
  test.beforeEach(async ({ kbnClient, browserAuth }) => {
    await kbnClient.importExport.load(testData.KBN_ARCHIVES.EDIT_SAVED_OBJECT);
    await browserAuth.loginAsAdmin();
  });

  test.afterEach(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('allows viewing a saved object as JSON', async ({ pageObjects }) => {
    await pageObjects.savedObjectsManagement.goto();
    const titles = await pageObjects.savedObjectsManagement.getRowTitles();
    expect(titles).toContain(testData.SAVED_OBJECT.DASHBOARD_TITLE);

    await pageObjects.savedObjectsManagement.gotoInspect(
      testData.SAVED_OBJECT.DASHBOARD_TYPE,
      testData.SAVED_OBJECT.DASHBOARD_ID
    );

    const content = await pageObjects.savedObjectsManagement.getInspectEditorContent();
    // Verify the editor shows JSON with top-level fields of the correct saved object.
    // 'A Dashboard' and 'references' are deep in the JSON (virtualized out of viewport)
    // and are better validated via API tests.
    for (const field of ['i-exist', 'id', 'type', 'attributes']) {
      expect(content, `Editor content should contain "${field}"`).toContain(field);
    }
  });

  test('allows deleting a saved object from the inspect view', async ({ pageObjects }) => {
    await pageObjects.savedObjectsManagement.gotoInspect(
      testData.SAVED_OBJECT.DASHBOARD_TYPE,
      testData.SAVED_OBJECT.DASHBOARD_ID
    );

    await pageObjects.savedObjectsManagement.deleteCurrentObject();

    const titles = await pageObjects.savedObjectsManagement.getRowTitles();
    expect(titles).not.toContain(testData.SAVED_OBJECT.DASHBOARD_TITLE);
  });
});
