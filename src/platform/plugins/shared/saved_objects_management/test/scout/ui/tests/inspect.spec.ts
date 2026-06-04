/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// SOM inspect view: delete via confirm modal. The only UI-only check —
// envelope rendering is exercised by `spaces_integration.spec.ts` and
// `api/tests/bulk_get.spec.ts`.

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, testData } from '../fixtures';

const { KBN_ARCHIVES, INSPECT_TARGETS } = testData;

test.describe('Saved objects management - inspect view', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
    await kbnClient.importExport.load(KBN_ARCHIVES.FEATURE_CONTROLS_SECURITY);
  });

  test.afterEach(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('inspect-view delete removes the object from the listing', async ({
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginAsAdmin();

    await pageObjects.savedObjectsManagement.gotoListing();
    expect(await pageObjects.savedObjectsManagement.getRowTitles()).toContain(
      INSPECT_TARGETS.DASHBOARD_TITLE
    );

    await pageObjects.savedObjectsManagement.clickInspectByTitle(INSPECT_TARGETS.DASHBOARD_TITLE);
    await pageObjects.savedObjectsManagement.deleteFromInspect();

    await pageObjects.savedObjectsManagement.gotoListing();
    expect(await pageObjects.savedObjectsManagement.getRowTitles()).not.toContain(
      INSPECT_TARGETS.DASHBOARD_TITLE
    );
  });
});
