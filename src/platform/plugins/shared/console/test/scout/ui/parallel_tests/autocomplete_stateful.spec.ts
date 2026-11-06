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
import { spaceTest } from '../fixtures';

const SNAPSHOT_TEMPLATES = [
  { type: 'fs', inserted: '"location": "path"' },
  { type: 'url', inserted: '"url": ""' },
  { type: 's3', inserted: '"bucket": ""' },
  { type: 'azure', inserted: '"path": ""' },
];

spaceTest.describe('Console autocomplete (stateful only)', { tag: tags.stateful.classic }, () => {
  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.console.goto();
    await pageObjects.console.skipTourIfExists();
    await pageObjects.console.clearEditorText();
  });

  // Stateful only: serverless handles backups internally and exposes no user-managed
  // snapshot repositories, so this completion returns nothing there (verified by hand for
  // every repository `type`).
  spaceTest(
    'inserts the snapshot repository template of the selected type',
    async ({ pageObjects }) => {
      for (const { type, inserted } of SNAPSHOT_TEMPLATES) {
        await spaceTest.step(type, async () => {
          await pageObjects.console.clearEditorText();
          await pageObjects.console.typeText(`POST _snapshot/test_repo\n{\n"type": "${type}",\ns`);
          await expect(pageObjects.console.suggestWidget).toBeVisible();

          await pageObjects.console.acceptAutocompleteSuggestion();

          await expect.poll(() => pageObjects.console.getEditorText()).toContain(inserted);
        });
      }
    }
  );
});
