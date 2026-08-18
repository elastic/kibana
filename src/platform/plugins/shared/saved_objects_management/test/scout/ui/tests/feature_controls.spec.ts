/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// SOM feature_controls UI smoke: per-role button visibility on listing /
// inspect view, plus app-not-found routing for users without SOM access.
// Capability/_find contracts live in the sibling API spec.

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, CUSTOM_ROLES, testData } from '../fixtures';

const { KBN_ARCHIVES, FEATURE_CONTROLS_OBJECT_IDS } = testData;

test.describe('Saved objects management feature controls', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
    await kbnClient.importExport.load(KBN_ARCHIVES.FEATURE_CONTROLS_SECURITY);
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.importExport.unload(KBN_ARCHIVES.FEATURE_CONTROLS_SECURITY);
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('global:all listing — select-all enables the delete action', async ({
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(CUSTOM_ROLES.global_all);
    await pageObjects.savedObjectsManagement.gotoListing();

    await expect(pageObjects.savedObjectsManagement.table).toBeVisible();
    await pageObjects.savedObjectsManagement.selectAllCheckbox.click();
    await expect(pageObjects.savedObjectsManagement.deleteListButton).toBeEnabled();
  });

  test('savedObjectsManagement:read listing — select-all keeps the delete action disabled', async ({
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(CUSTOM_ROLES.global_som_read);
    await pageObjects.savedObjectsManagement.gotoListing();

    await expect(pageObjects.savedObjectsManagement.table).toBeVisible();
    await pageObjects.savedObjectsManagement.selectAllCheckbox.click();
    await expect(pageObjects.savedObjectsManagement.deleteListButton).toBeDisabled();
  });

  test('global:all inspect view shows the delete button and the JSON editor', async ({
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(CUSTOM_ROLES.global_all);
    await pageObjects.savedObjectsManagement.gotoInspect(
      'visualization',
      FEATURE_CONTROLS_OBJECT_IDS.VISUALIZATION
    );

    await expect(pageObjects.savedObjectsManagement.codeEditor).toBeVisible();
    await expect(pageObjects.savedObjectsManagement.inspectDeleteButton).toBeVisible();
  });

  test('savedObjectsManagement:read inspect view shows the JSON editor but hides delete & save', async ({
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(CUSTOM_ROLES.global_som_read);
    await pageObjects.savedObjectsManagement.gotoInspect(
      'visualization',
      FEATURE_CONTROLS_OBJECT_IDS.VISUALIZATION
    );

    await expect(pageObjects.savedObjectsManagement.codeEditor).toBeVisible();
    await expect(pageObjects.savedObjectsManagement.inspectDeleteButton).toBeHidden();
    await expect(pageObjects.savedObjectsManagement.inspectSaveButton).toBeHidden();
  });

  test('visualize:minimal_all alone routes the SOM listing URL to appNotFound', async ({
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(CUSTOM_ROLES.global_visualize_all);
    await pageObjects.savedObjectsManagement.gotoListing();

    await expect(pageObjects.savedObjectsManagement.appNotFoundPageContent).toBeVisible();
  });

  test('visualize:minimal_all alone routes the SOM inspect URL to appNotFound', async ({
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(CUSTOM_ROLES.global_visualize_all);
    await pageObjects.savedObjectsManagement.gotoInspect(
      'visualization',
      FEATURE_CONTROLS_OBJECT_IDS.VISUALIZATION
    );

    await expect(pageObjects.savedObjectsManagement.appNotFoundPageContent).toBeVisible();
  });
});
