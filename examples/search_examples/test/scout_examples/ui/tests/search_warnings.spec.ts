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

const DOWNSAMPLED_ARCHIVE = 'src/platform/test/functional/fixtures/es_archiver/search/downsampled';
const TEST_INDEX = 'sample-01';
const TEST_ROLLUP_INDEX = 'sample-01-rollup';
const DATA_VIEW_TITLE = 'sample-01,sample-01-rollup';

test.describe('Search example shard-failure warnings', { tag: '@local-stateful-classic' }, () => {
  test.beforeAll(async ({ apiServices, esArchiver, esClient, log }) => {
    log.debug('[setup:search_warnings] loading downsampled archive...');
    await esArchiver.loadIfNeeded(DOWNSAMPLED_ARCHIVE);
    await esClient.indices.addBlock({ index: TEST_INDEX, block: 'write' });
    try {
      await esClient.transport.request({
        method: 'POST',
        path: `/${TEST_INDEX}/_downsample/${TEST_ROLLUP_INDEX}`,
        body: { fixed_interval: '1h' },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes('resource_already_exists_exception')) {
        throw err;
      }
    }

    await apiServices.dataViews.create({
      title: DATA_VIEW_TITLE,
      timeFieldName: '@timestamp',
      override: true,
    });
  });

  test.afterAll(async ({ apiServices, esClient }) => {
    await esClient.indices.delete({
      index: [TEST_INDEX, TEST_ROLLUP_INDEX],
      ignore_unavailable: true,
    });
    await apiServices.dataViews.deleteByTitle(DATA_VIEW_TITLE);
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.searchExamples.gotoSearch();
    await pageObjects.searchExamples.configureWarningsDemo();
    await pageObjects.toasts.dismissAll();
  });

  test.afterEach(async ({ pageObjects }) => {
    await pageObjects.toasts.dismissAll();
  });

  test('shows shard-failure warnings as toasts and can open inspector', async ({ pageObjects }) => {
    const { searchExamples } = pageObjects;
    await searchExamples.searchSourceWithOther.click();

    await expect(searchExamples.viewWarningBtn).toBeVisible();
    await searchExamples.viewWarningBtn.click();
    await expect(searchExamples.inspectorPanel).toBeVisible();

    await searchExamples.inspectorCloseButton.click();
    await expect(searchExamples.inspectorPanel).toHaveCount(0);
  });

  test('shows incomplete warnings on the results tab', async ({ pageObjects }) => {
    const { searchExamples } = pageObjects;
    await searchExamples.searchSourceWithoutOther.click();
    await expect(searchExamples.viewWarningBtn).toBeVisible();

    await searchExamples.warningsTab.click();
    await expect(searchExamples.warningsCodeBlock).toContainText('incomplete');
  });
});
