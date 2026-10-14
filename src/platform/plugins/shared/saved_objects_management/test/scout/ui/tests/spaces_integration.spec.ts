/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// SOM ↔ Spaces routing smoke: inspecting a saved object from a non-default
// space must stay within the space's basePath and render its JSON envelope.

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, testData } from '../fixtures';

const { KBN_ARCHIVES } = testData;

const SPACE_ID = 'space_1';
const TARGET_TITLE = 'A Pie';

test.describe(
  'Saved objects management - spaces integration',
  { tag: tags.stateful.classic },
  () => {
    test.beforeAll(async ({ kbnClient }) => {
      await kbnClient.spaces.create({
        id: SPACE_ID,
        name: SPACE_ID,
        disabledFeatures: [],
      });
      await kbnClient.importExport.load(KBN_ARCHIVES.SPACES_INTEGRATION, { space: SPACE_ID });
    });

    test.afterAll(async ({ kbnClient }) => {
      await kbnClient.spaces.delete(SPACE_ID);
    });

    test('inspecting an object from a non-default space stays in that space and renders the JSON editor', async ({
      browserAuth,
      page,
      pageObjects,
    }) => {
      await browserAuth.loginAsAdmin();

      await pageObjects.savedObjectsManagement.gotoListing(SPACE_ID);
      // `clickInspectByTitle` waits for the matching row before opening the
      // context menu, so no separate "row is present" assertion is needed.
      await pageObjects.savedObjectsManagement.clickInspectByTitle(TARGET_TITLE);

      await expect(page).toHaveURL(new RegExp(`/s/${SPACE_ID}/`));
      await expect(pageObjects.savedObjectsManagement.codeEditor).toBeVisible();

      // Read the Monaco model directly — virtualisation can hide fields below
      // the fold (e.g. `references`) from plain `innerText`/`toContainText`.
      const editorText = await pageObjects.savedObjectsManagement.getCodeEditorValue();
      for (const fragment of [TARGET_TITLE, 'title', 'id', 'type', 'attributes', 'references']) {
        expect(editorText).toContain(fragment);
      }
    });
  }
);
