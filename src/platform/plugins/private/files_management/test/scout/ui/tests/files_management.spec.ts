/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Files are not scoped to a Kibana space, so these tests share one global list:
// the empty-state assertion only holds once every pre-existing file is gone.
// Hence the sequential suite and the delete-everything hooks.
//
// FTR source: src/platform/test/functional/apps/management/group4/_files.ts

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import type { KbnClient } from '@kbn/scout';
import { test, testData } from '../fixtures';

const { FILES_API } = testData;

interface FileSummary {
  id: string;
  fileKind: string;
}

// The management table lists every non-excluded file kind, so the empty-state
// assertion only holds once files of ALL kinds are gone — not just defaultImage.
// `find` is paginated, so drain page-by-page until nothing is left.
const deleteAllFiles = async (kbnClient: KbnClient): Promise<void> => {
  for (;;) {
    const { data } = await kbnClient.request<{ files: FileSummary[] }>({
      method: 'POST',
      path: FILES_API.FIND,
      body: {},
    });

    if (data.files.length === 0) {
      return;
    }

    for (const file of data.files) {
      await kbnClient.request({ method: 'DELETE', path: FILES_API.delete(file.fileKind, file.id) });
    }
  }
};

test.describe('Files management', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth, kbnClient }) => {
    await deleteAllFiles(kbnClient);
    await browserAuth.loginAsAdmin();
  });

  test.afterEach(async ({ kbnClient }) => {
    await deleteAllFiles(kbnClient);
  });

  test('shows an empty prompt when no files exist', async ({ pageObjects }) => {
    await pageObjects.filesManagement.goto();

    await expect(pageObjects.filesManagement.app).toContainText('No files found');
  });

  test('breaks files down by extension and status in the diagnostics flyout', async ({
    kbnClient,
    pageObjects,
  }) => {
    await kbnClient.request({
      method: 'POST',
      path: FILES_API.CREATE,
      body: { name: 'test', mimeType: 'image/png' },
    });

    await pageObjects.filesManagement.goto();
    await pageObjects.filesManagement.openDiagnosticsFlyout();

    await expect(pageObjects.filesManagement.diagnosticsFlyout).toContainText('Count by extension');
    await expect(pageObjects.filesManagement.diagnosticsFlyout).toContainText('Count by status');
  });
});
