/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const DATE_NESTED_ES_ARCHIVE = 'src/platform/test/functional/fixtures/es_archiver/date_nested';
const DATE_NESTED_KBN_ARCHIVE =
  'src/platform/test/functional/fixtures/kbn_archiver/date_nested.json';
// Index created by the date_nested ES archive
const DATE_NESTED_INDEX = 'date-nested';

test.describe('Discover — nested date as time field', { tag: '@local-stateful-classic' }, () => {
  test.beforeAll(async ({ esArchiver, kbnClient }) => {
    await esArchiver.loadIfNeeded(DATE_NESTED_ES_ARCHIVE);
    await kbnClient.importExport.load(DATE_NESTED_KBN_ARCHIVE);
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'classic' });
  });

  test.afterAll(async ({ esClient, kbnClient }) => {
    await esClient.indices.delete({ index: DATE_NESTED_INDEX });
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('shows an error callout when the time field is a nested date', async ({
    page,
    pageObjects,
  }) => {
    await pageObjects.discover.selectDataView('date-nested');
    await expect(page.testSubj.locator('discoverErrorCalloutTitle')).toBeVisible();
  });
});
