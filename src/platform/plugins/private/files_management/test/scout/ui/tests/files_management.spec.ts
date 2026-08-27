/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Files are not space-scoped, so this suite shares one global list with every
// other suite on the server. It therefore only asserts the data-present path
// (the diagnostics flyout) and cleans up just the files it creates — never the
// whole deployment. The empty-state ("No files found") branch cannot be
// guaranteed on a shared server, so it is covered by a unit test instead:
// public/components/empty_prompt.test.tsx.
//
// FTR source: src/platform/test/functional/apps/management/group4/_files.ts

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, testData } from '../fixtures';

const { FILES_API, FILE_KIND } = testData;

test.describe('Files management', { tag: tags.stateful.classic }, () => {
  const createdFileIds: string[] = [];

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterEach(async ({ kbnClient }) => {
    while (createdFileIds.length > 0) {
      const id = createdFileIds.pop()!;
      await kbnClient.request({ method: 'DELETE', path: FILES_API.delete(FILE_KIND, id) });
    }
  });

  test('breaks files down by extension and status in the diagnostics flyout', async ({
    kbnClient,
    pageObjects,
  }) => {
    // Files are not space-scoped, so the name is namespaced per run to avoid
    // colliding with anything another suite on the shared server creates.
    const { data } = await kbnClient.request<{ file: { id: string } }>({
      method: 'POST',
      path: FILES_API.CREATE,
      body: { name: `diagnostics-${Math.random().toString(36).slice(2)}`, mimeType: 'image/png' },
    });
    createdFileIds.push(data.file.id);

    await pageObjects.filesManagement.goto();
    await pageObjects.filesManagement.openDiagnosticsFlyout();

    await expect(pageObjects.filesManagement.diagnosticsFlyout).toContainText('Count by extension');
    await expect(pageObjects.filesManagement.diagnosticsFlyout).toContainText('Count by status');
  });
});
