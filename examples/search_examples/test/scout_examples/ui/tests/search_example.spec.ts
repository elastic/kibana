/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Smoke coverage of the search_examples demo.
 */

import { assertOtherBucketResponse, test } from '../fixtures';

test.describe('Search example', { tag: '@local-stateful-classic' }, () => {
  test.beforeEach(async ({ browserAuth, page, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.searchExamples.gotoSearch();
    await pageObjects.searchExamples.configureSearchDemo();
    await page.components.toast().closeAll();
  });

  test('should have an other bucket', async ({ pageObjects }) => {
    const { searchExamples } = pageObjects;
    await test.step('run search with other bucket', async () => {
      await searchExamples.searchSourceWithOther.click();
    });
    await test.step('assert other bucket in response', async () => {
      await assertOtherBucketResponse(searchExamples, { expectOtherBucket: true });
    });
  });

  test('should not have an other bucket', async ({ pageObjects }) => {
    const { searchExamples } = pageObjects;
    await test.step('run search without other bucket', async () => {
      await searchExamples.searchSourceWithoutOther.click();
    });
    await test.step('assert no other bucket in response', async () => {
      await assertOtherBucketResponse(searchExamples, { expectOtherBucket: false });
    });
  });

  test('should handle warnings', async ({ pageObjects }) => {
    await pageObjects.searchExamples.searchWithWarning.click();
    await pageObjects.toasts.waitForToastWithText('Watch out!');
  });
});
