/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// SOM import flows that succeed outright: the imported objects land in the
// table and their references are navigable from the relationships flyout.
// Conflict resolution lives in the sibling `import_conflicts.spec.ts`, and
// import outcomes that need no browser live in `api/tests/import_references.spec.ts`.
//
// FTR source: src/platform/test/functional/apps/management/group4/_import_objects.ts
//
// Not ported: "should not allow import without a file added". The import button's
// disabled state is local component state with no server round-trip, and it is
// already asserted in both directions by
// public/management_section/objects_table/components/flyout.test.tsx.

import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, testData } from '../fixtures';

const { KBN_ARCHIVES, NDJSON_EXPORTS, IMPORT_FIXTURE_OBJECTS } = testData;

const ndjsonPath = (relativePath: string) => Path.resolve(REPO_ROOT, relativePath);

test.describe('Saved objects management - import objects', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth, kbnClient, pageObjects }) => {
    // Seeds the `logstash-*` data view the imported objects reference, plus the
    // "Shared-Item Visualization AreaChart" that shows up as a second parent.
    await kbnClient.importExport.load(KBN_ARCHIVES.MANAGEMENT);
    await browserAuth.loginAsAdmin();
    await pageObjects.savedObjectsManagement.gotoListing();
    await pageObjects.savedObjectsManagement.waitForTableLoaded();
  });

  test.afterEach(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('imports a visualization and lists it as a child of its data view', async ({
    pageObjects,
  }) => {
    const som = pageObjects.savedObjectsManagement;

    await test.step('import the visualization', async () => {
      await som.importFile(ndjsonPath(NDJSON_EXPORTS.OBJECTS));
      expect(await som.getObjectTypeByTitle(IMPORT_FIXTURE_OBJECTS.LOG_AGENTS_TITLE)).toBe(
        'visualization'
      );
    });

    await test.step('both visualizations are parents of the data view', async () => {
      await som.clickRelationshipsByTitle(IMPORT_FIXTURE_OBJECTS.INDEX_PATTERN_TITLE);

      // The archive contributes the Shared-Item visualization; the import adds
      // Log Agents. Both reference the data view, so both are listed as parents.
      // Assert containment, not totality: another suite on the shared server
      // could reference the same data view. Poll because the flyout table
      // renders its rows asynchronously.
      await expect
        .poll(() => som.getRelationships())
        .toStrictEqual(
          expect.arrayContaining([
            { title: IMPORT_FIXTURE_OBJECTS.SHARED_ITEM_VIZ_TITLE, relationship: 'Parent' },
            { title: IMPORT_FIXTURE_OBJECTS.LOG_AGENTS_TITLE, relationship: 'Parent' },
          ])
        );
    });
  });

  test('imports objects that reference each other in a cycle', async ({ pageObjects }) => {
    const som = pageObjects.savedObjectsManagement;

    await som.importFile(ndjsonPath(NDJSON_EXPORTS.CIRCULAR_REFS));
    await som.clickRelationshipsByTitle(IMPORT_FIXTURE_OBJECTS.CIRCULAR_DASHBOARD_A);

    // dashboard-a and dashboard-b reference each other, so the single related
    // object is listed twice — once in each direction. The flyout here is scoped
    // to the just-imported dashboard-a, so containment still fully proves the
    // both-directions relationship. Poll: the flyout table renders asynchronously.
    await expect
      .poll(() => som.getRelationships())
      .toStrictEqual(
        expect.arrayContaining([
          { title: IMPORT_FIXTURE_OBJECTS.CIRCULAR_DASHBOARD_B, relationship: 'Parent' },
          { title: IMPORT_FIXTURE_OBJECTS.CIRCULAR_DASHBOARD_B, relationship: 'Child' },
        ])
      );
  });
});
