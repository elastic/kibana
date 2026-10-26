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

// The `testhuge` index has 10 006 fields.
const ES_ARCHIVE_LARGE_FIELDS = 'src/platform/test/functional/fixtures/es_archiver/large_fields';
const EXPECTED_FIELD_COUNT = 10006;

// Scale regression guard: catches field caps responses being truncated or paginated without
// the UI handling it. Not run on Cloud because of the size of the index.
test.describe('Data view with a large number of fields', { tag: '@local-stateful-classic' }, () => {
  let dataViewId: string;

  test.beforeAll(async ({ apiServices, esArchiver }) => {
    await esArchiver.loadIfNeeded(ES_ARCHIVE_LARGE_FIELDS);
    const { data } = await apiServices.dataViews.create({
      title: 'testhuge',
      timeFieldName: 'date',
    });
    dataViewId = data.id;
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test.afterAll(async ({ apiServices, esClient }) => {
    await apiServices.dataViews.delete(dataViewId);
    await esClient.indices.delete({ index: 'testhuge', ignore_unavailable: true });
  });

  test('shows the expected number of fields', async ({ pageObjects }) => {
    await pageObjects.dataViewDetail.goto(dataViewId);

    await expect
      .poll(() => pageObjects.dataViewDetail.getFieldsTabCount())
      .toBe(EXPECTED_FIELD_COUNT);
  });
});
