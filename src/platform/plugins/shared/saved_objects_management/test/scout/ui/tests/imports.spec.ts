/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// SOM import-flow UI smoke. Browser-only checks here; pure import counts live
// in the sibling API spec.
//   1. 7.13 cross-version import → imported dashboard renders without errors.
//   2. SOM "Copy to space" flyout copies a dashboard between two spaces.

import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, testData } from '../fixtures';

const { ES_ARCHIVES, NDJSON_EXPORTS, NDJSON_EXPECTED_COUNTS, V_7_13_DASHBOARD_IDS } = testData;

const ANOTHER_SPACE_ID = 'another_space';
const THIRD_SPACE_ID = 'third_space';
const MULTI_SPACE_TITLE = 'multi_space_import_8.0.0_export';

// Time range the 7.13 dashboards were authored against; required for the
// panels to actually render data from logstash_functional.
const LOGSTASH_FROM = 'Sep 19, 2015 @ 06:31:44.000';
const LOGSTASH_TO = 'Sep 23, 2015 @ 18:31:44.000';

const ndjsonPath = (relativePath: string) => Path.resolve(REPO_ROOT, relativePath);

test.describe('Saved objects management - imports (UI)', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ kbnClient, esArchiver }) => {
    // Data the imported 7.13 dashboards target.
    await esArchiver.loadIfNeeded(ES_ARCHIVES.LOGSTASH_FUNCTIONAL);
    await esArchiver.loadIfNeeded(ES_ARCHIVES.SHAKESPEARE);
    await kbnClient.savedObjects.cleanStandardList();

    await kbnClient.spaces.create({
      id: ANOTHER_SPACE_ID,
      name: ANOTHER_SPACE_ID,
      disabledFeatures: [],
    });
    await kbnClient.spaces.create({
      id: THIRD_SPACE_ID,
      name: THIRD_SPACE_ID,
      disabledFeatures: [],
    });
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.spaces.delete(ANOTHER_SPACE_ID);
    await kbnClient.spaces.delete(THIRD_SPACE_ID);
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('importing 7.13 saved objects lets the imported dashboard render without errors', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.savedObjectsManagement.gotoListing();

    await pageObjects.savedObjectsManagement.importFile(
      ndjsonPath(NDJSON_EXPORTS.V_7_13_SAVED_OBJECTS)
    );

    // Smallest of the imported dashboards (2 panels) — load it and assert no
    // `embeddableError` rendered. Import counts are covered by the API spec.
    await pageObjects.dashboard.openDashboardWithId(V_7_13_DASHBOARD_IDS.LENS_COMBINED);
    await pageObjects.datePicker.setAbsoluteRange({ from: LOGSTASH_FROM, to: LOGSTASH_TO });
    await pageObjects.dashboard.waitForRenderComplete();

    const errorEmbeddables = page.locator('[data-test-subj="embeddableError"]');
    await expect(errorEmbeddables).toHaveCount(0);
  });

  test('copy-to-space flyout copies a dashboard from one space to another', async ({
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginAsAdmin();

    // Seed `another_space` with the 8.0 ndjson via the UI import flow so we
    // exercise the same path a user would take before copying.
    await pageObjects.savedObjectsManagement.gotoListing(ANOTHER_SPACE_ID);
    await pageObjects.savedObjectsManagement.importFile(
      ndjsonPath(NDJSON_EXPORTS.V_8_0_MULTISPACE)
    );

    await pageObjects.savedObjectsManagement.searchFor(MULTI_SPACE_TITLE);
    await pageObjects.savedObjectsManagement.clickCopyToSpaceByTitle(MULTI_SPACE_TITLE);
    await pageObjects.copySavedObjectsToSpaceFlyout.waitForOpen();

    await pageObjects.copySavedObjectsToSpaceFlyout.setupForm({
      createNewCopies: true,
      overwrite: false,
      destinationSpaceId: THIRD_SPACE_ID,
    });
    await pageObjects.copySavedObjectsToSpaceFlyout.startCopy();
    await pageObjects.copySavedObjectsToSpaceFlyout.waitForCopyToFinish(THIRD_SPACE_ID);

    const summary = await pageObjects.copySavedObjectsToSpaceFlyout.getSummaryCounts();
    expect(summary).toStrictEqual({
      success: NDJSON_EXPECTED_COUNTS.V_8_0_MULTISPACE,
      pending: 0,
      skipped: 0,
      errors: 0,
    });

    await pageObjects.copySavedObjectsToSpaceFlyout.finishCopy();
  });
});
