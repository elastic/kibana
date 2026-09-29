/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Stateful-only: serverless already forces bfetch off via uiSettings.overrides.
 */

import { assertOtherBucketResponse, test } from '../fixtures';

test.describe('Search example with bfetch disabled', { tag: '@local-stateful-classic' }, () => {
  test.beforeAll(async ({ kbnClient }) => {
    await kbnClient.uiSettings.update({ 'bfetch:disable': true });
  });

  test.beforeEach(async ({ browserAuth, page, pageObjects }) => {
    const { searchExamples } = pageObjects;
    await browserAuth.loginAsViewer();
    await searchExamples.gotoSearch();
    await searchExamples.configureSearchDemo();
    await page.components.toast().closeAll();
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.uiSettings.unset('bfetch:disable');
  });

  test('should have an other bucket', async ({ pageObjects }) => {
    const { searchExamples } = pageObjects;
    await searchExamples.searchSourceWithOther.click();
    await assertOtherBucketResponse(searchExamples, { expectOtherBucket: true });
  });

  test('should not have an other bucket', async ({ pageObjects }) => {
    const { searchExamples } = pageObjects;
    await searchExamples.searchSourceWithoutOther.click();
    await assertOtherBucketResponse(searchExamples, { expectOtherBucket: false });
  });

  test('should show a warning toast', async ({ pageObjects }) => {
    const { searchExamples } = pageObjects;
    await searchExamples.searchWithWarning.click();
    await pageObjects.toasts.waitForToastWithText('Watch out!');
  });
});
