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

test.describe('Search example shard-failure warnings', { tag: '@local-stateful-classic' }, () => {
  test.beforeEach(async ({ browserAuth, downsampledSample, page, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.searchExamples.gotoSearch();
    await pageObjects.searchExamples.configureWarningsDemo(downsampledSample.dataViewName);
    await page.components.toast().closeAll();
  });

  test.afterEach(async ({ page }) => {
    await page.components.toast().closeAll();
  });

  test('shows shard-failure warnings as toasts and can open inspector', async ({ pageObjects }) => {
    const { inspector, searchExamples } = pageObjects;

    await test.step('run shard-failure search', async () => {
      await searchExamples.searchSourceWithOther.click();
      await expect(searchExamples.viewWarningBtn).toBeVisible();
    });

    await test.step('open inspector from warning toast', async () => {
      await searchExamples.viewWarningBtn.click();
      await expect(inspector.panel).toBeVisible();
    });

    await test.step('close inspector', async () => {
      await inspector.close();
    });
  });

  test('shows incomplete warnings on the results tab', async ({ pageObjects }) => {
    const { searchExamples } = pageObjects;
    await searchExamples.searchSourceWithoutOther.click();
    await expect(searchExamples.viewWarningBtn).toBeVisible();

    await searchExamples.warningsTab.click();
    await expect(searchExamples.warningsCodeBlock).toContainText('incomplete');
  });
});
