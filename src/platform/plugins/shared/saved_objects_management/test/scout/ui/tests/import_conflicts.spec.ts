/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// SOM import flows that need the user to resolve something before the import
// completes: an unresolved data view reference, or an object that already
// exists. Straightforward imports live in the sibling `import_objects.spec.ts`.
//
// FTR sources:
//   src/platform/test/functional/apps/management/group4/_import_objects.ts
//   src/platform/test/functional/apps/management/group4/_mgmt_import_saved_objects.ts

import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, testData } from '../fixtures';

const { KBN_ARCHIVES, NDJSON_EXPORTS, IMPORT_FIXTURE_OBJECTS } = testData;

const ndjsonPath = (relativePath: string) => Path.resolve(REPO_ROOT, relativePath);

test.describe('Saved objects management - import conflicts', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth, kbnClient, pageObjects }) => {
    // Provides the `logstash-*` data view every replacement below points at, and
    // the "Shared-Item Visualization AreaChart" the overwrite cases collide with.
    await kbnClient.importExport.load(KBN_ARCHIVES.MANAGEMENT);
    await browserAuth.loginAsAdmin();
    await pageObjects.savedObjectsManagement.gotoListing();
    await pageObjects.savedObjectsManagement.waitForTableLoaded();
  });

  test.afterEach(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('imports an object after pointing its missing data view at an existing one', async ({
    pageObjects,
  }) => {
    const som = pageObjects.savedObjectsManagement;

    await som.selectImportFile(ndjsonPath(NDJSON_EXPORTS.CONFLICTS));
    await som.submitImport();

    await expect(som.importConflictsWarning).toBeVisible();
    await som.selectReplacementIndexPattern(
      IMPORT_FIXTURE_OBJECTS.CONFLICT_MISSING_INDEX_PATTERN_ID,
      IMPORT_FIXTURE_OBJECTS.INDEX_PATTERN_TITLE
    );
    await som.confirmImportChanges();
    await som.finishImport();

    await expect(som.rowByTitle(IMPORT_FIXTURE_OBJECTS.CONFLICT_VIZ_TITLE)).toBeVisible();
  });

  test('overwrites an existing object when the user confirms', async ({ pageObjects }) => {
    const som = pageObjects.savedObjectsManagement;

    // "Request action on conflict" so the already-present Shared-Item
    // visualization prompts instead of being replaced silently.
    await som.selectImportFile(ndjsonPath(NDJSON_EXPORTS.EXISTS), { overwrite: false });
    await som.submitImport();

    await expect(som.importConflictsWarning).toBeVisible();
    await som.selectReplacementIndexPattern(
      IMPORT_FIXTURE_OBJECTS.EXISTS_MISSING_INDEX_PATTERN_ID,
      IMPORT_FIXTURE_OBJECTS.INDEX_PATTERN_TITLE
    );
    await som.confirmImportChanges();

    await som.overwriteConfirmButton.click();

    await expect(som.importSuccess).toBeVisible();
  });

  test('keeps the existing object when the user skips the overwrite', async ({ pageObjects }) => {
    const som = pageObjects.savedObjectsManagement;

    await som.selectImportFile(ndjsonPath(NDJSON_EXPORTS.EXISTS), { overwrite: false });
    await som.submitImport();

    await expect(som.importConflictsWarning).toBeVisible();
    await som.selectReplacementIndexPattern(
      IMPORT_FIXTURE_OBJECTS.EXISTS_MISSING_INDEX_PATTERN_ID,
      IMPORT_FIXTURE_OBJECTS.INDEX_PATTERN_TITLE
    );
    await som.confirmImportChanges();

    await som.overwriteCancelButton.click();

    await expect(som.importNoneImported).toBeVisible();
  });

  test('drops a visualization whose saved search keeps an unresolvable data view', async ({
    apiServices,
    pageObjects,
  }) => {
    const som = pageObjects.savedObjectsManagement;

    // Remove the data view the bundled saved search points at, so the conflict
    // cannot be resolved. Mirrors the FTR flow (delete `logstash-*`, import,
    // Confirm Changes without a replacement) and asserts through the UI that the
    // connected visualization does not land — the API-level outcome for this same
    // payload lives in `api/tests/import_references.spec.ts`.
    await apiServices.dataViews.deleteByTitle(IMPORT_FIXTURE_OBJECTS.INDEX_PATTERN_TITLE);

    await som.selectImportFile(ndjsonPath(NDJSON_EXPORTS.WITH_SAVED_SEARCH));
    await som.submitImport();

    await expect(som.importConflictsWarning).toBeVisible();
    await som.confirmImportChanges();
    await som.finishImport();

    await som.searchForExpectingNoResults(IMPORT_FIXTURE_OBJECTS.CONNECTED_TO_SAVED_SEARCH_TITLE);
  });

  test('imports a visualization whose saved search had an unresolved data view', async ({
    pageObjects,
  }) => {
    const som = pageObjects.savedObjectsManagement;

    // Regression cover for https://github.com/elastic/kibana/issues/22238: in
    // 6.4.0 the conflicted saved search was imported but the visualization
    // referencing it was silently dropped.
    await som.selectImportFile(ndjsonPath(NDJSON_EXPORTS.MGMT_OBJECTS));
    await som.submitImport();

    await expect(som.importConflictsWarning).toBeVisible();
    await som.selectReplacementIndexPattern(
      IMPORT_FIXTURE_OBJECTS.MGMT_MISSING_INDEX_PATTERN_ID,
      IMPORT_FIXTURE_OBJECTS.INDEX_PATTERN_TITLE
    );
    await som.confirmImportChanges();
    await som.finishImport();

    // The saved search resolves the conflict; the visualization referencing it
    // has to come along with it — that is the part 6.4.0 dropped.
    await som.searchFor('mysaved');
    await expect(som.rowByTitle(IMPORT_FIXTURE_OBJECTS.MGMT_SAVED_SEARCH_TITLE)).toBeVisible();
    await expect(som.rowByTitle(IMPORT_FIXTURE_OBJECTS.MGMT_VIZ_TITLE)).toBeVisible();
  });
});
