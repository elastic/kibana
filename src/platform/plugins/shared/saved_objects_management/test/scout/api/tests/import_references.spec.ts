/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Whether an object imports depends on whether the objects it references are
// already present or bundled alongside it. These assert on the import outcome
// only, so they run without a browser; the flows where the user resolves a
// conflict interactively live in `ui/tests/import_conflicts.spec.ts`.
//
// FTR source: src/platform/test/functional/apps/management/group4/_import_objects.ts

import Fs from 'fs';
import Path from 'path';
import FormData from 'form-data';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ApiClientFixture, RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

const { COMMON_HEADERS, KBN_ARCHIVES, MANAGEMENT_API, NDJSON_EXPORTS, IMPORT_FIXTURE_OBJECTS } =
  testData;

// Ids the fixtures reference, needed to assert on `missing_references` errors.
const SAVED_SEARCH_ID = 'c45e6c50-ba72-11e7-a8f9-ad70f02e633d';
const CONNECTED_VIZ_ID = 'saved_object_connected_to_saved_search';

const importNdjson = (relativePath: string): { headers: Record<string, string>; body: Buffer } => {
  const form = new FormData();
  form.append('file', Fs.readFileSync(Path.resolve(REPO_ROOT, relativePath)), 'import.ndjson');
  return { headers: form.getHeaders(), body: form.getBuffer() };
};

apiTest.describe(
  'Saved Objects Management - import references',
  { tag: tags.stateful.classic },
  () => {
    let adminCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth }) => {
      adminCredentials = await requestAuth.getApiKey('admin');
    });

    // Each test states its own starting point rather than relying on the
    // previous one's teardown — several assert on objects being *absent*.
    apiTest.beforeEach(async ({ kbnClient }) => {
      await kbnClient.savedObjects.cleanStandardList();
    });

    apiTest.afterEach(async ({ kbnClient }) => {
      await kbnClient.savedObjects.cleanStandardList();
    });

    const importFixture = async (apiClient: ApiClientFixture, fixturePath: string) => {
      const { headers, body } = importNdjson(fixturePath);
      return apiClient.post(`${MANAGEMENT_API.IMPORT}?overwrite=true`, {
        headers: { ...adminCredentials.apiKeyHeader, ...COMMON_HEADERS, ...headers },
        body,
      });
    };

    apiTest(
      'imports a visualization when the saved search it references already exists',
      async ({ apiClient, kbnClient }) => {
        await kbnClient.importExport.load(KBN_ARCHIVES.MANAGEMENT);

        const savedSearchResponse = await importFixture(apiClient, NDJSON_EXPORTS.SAVED_SEARCH);
        expect(savedSearchResponse).toHaveStatusCode(200);
        expect(savedSearchResponse.body).toMatchObject({ success: true, successCount: 1 });

        const vizResponse = await importFixture(
          apiClient,
          NDJSON_EXPORTS.CONNECTED_TO_SAVED_SEARCH
        );
        expect(vizResponse).toHaveStatusCode(200);
        expect(vizResponse.body).toMatchObject({ success: true, successCount: 1 });

        const imported = await kbnClient.savedObjects.get({
          type: 'visualization',
          id: CONNECTED_VIZ_ID,
        });
        expect(imported.attributes.title).toBe(
          IMPORT_FIXTURE_OBJECTS.CONNECTED_TO_SAVED_SEARCH_TITLE
        );
      }
    );

    apiTest(
      'refuses a visualization whose saved search does not exist',
      async ({ apiClient, kbnClient }) => {
        await kbnClient.importExport.load(KBN_ARCHIVES.MANAGEMENT);

        const response = await importFixture(apiClient, NDJSON_EXPORTS.CONNECTED_TO_SAVED_SEARCH);

        expect(response).toHaveStatusCode(200);
        expect(response.body).toMatchObject({
          success: false,
          successCount: 0,
          errors: [
            {
              type: 'visualization',
              id: CONNECTED_VIZ_ID,
              error: {
                type: 'missing_references',
                references: [{ type: 'search', id: SAVED_SEARCH_ID }],
              },
            },
          ],
        });
      }
    );

    apiTest(
      'reports the bundled visualization as importable when its saved search has a missing data view',
      async ({ apiClient }) => {
        // WITH_SAVED_SEARCH references a data-view id that is not on the
        // cluster (and is not the shared `logstash-*` from MANAGEMENT).
        //
        // The visualization references the saved search, and a reference to an
        // object in the same file counts as satisfied — so `_import` reports
        // the visualization in `successResults` even though the saved search it
        // points at was rejected. Because the response carries a resolvable
        // `missing_references` error, this is a dry run: nothing is persisted.
        // This asserts that API contract; the end-to-end UI flow (import via
        // the flyout, Confirm Changes with the reference unresolved, and the
        // visualization dropped from the table) is covered in
        // `ui/tests/import_conflicts.spec.ts`.
        const response = await importFixture(apiClient, NDJSON_EXPORTS.WITH_SAVED_SEARCH);

        expect(response).toHaveStatusCode(200);
        expect(response.body).toMatchObject({
          success: false,
          successCount: 1,
          successResults: [
            expect.objectContaining({ type: 'visualization', id: CONNECTED_VIZ_ID }),
          ],
          errors: [
            expect.objectContaining({
              type: 'search',
              id: SAVED_SEARCH_ID,
              error: expect.objectContaining({
                type: 'missing_references',
                references: [
                  {
                    type: 'index-pattern',
                    id: IMPORT_FIXTURE_OBJECTS.WITH_SAVED_SEARCH_MISSING_INDEX_PATTERN_ID,
                  },
                ],
              }),
            }),
          ],
        });
      }
    );

    apiTest(
      'imports objects that bundle their own data view, whether or not it already exists',
      async ({ apiClient, kbnClient }) => {
        const freshResponse = await importFixture(apiClient, NDJSON_EXPORTS.WITH_INDEX_PATTERNS);
        expect(freshResponse).toHaveStatusCode(200);
        expect(freshResponse.body).toMatchObject({ success: true, successCount: 2 });

        // Re-importing over the data view it just created still succeeds.
        const repeatResponse = await importFixture(apiClient, NDJSON_EXPORTS.WITH_INDEX_PATTERNS);
        expect(repeatResponse).toHaveStatusCode(200);
        expect(repeatResponse.body).toMatchObject({ success: true, successCount: 2 });

        const imported = await kbnClient.savedObjects.get({
          type: 'visualization',
          id: 'saved_object_imported_with_index_pattern',
        });
        expect(imported.attributes.title).toBe(
          IMPORT_FIXTURE_OBJECTS.IMPORTED_WITH_INDEX_PATTERN_TITLE
        );
      }
    );
  }
);
