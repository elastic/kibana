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

test.describe('Partial results example', { tag: '@local-stateful-classic' }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.searchExamples.gotoSearch();
    await pageObjects.searchExamples.requestFibonacci.waitFor({ state: 'visible' });
  });

  test('should update a progress bar', async ({ pageObjects }) => {
    const { searchExamples } = pageObjects;
    await searchExamples.responseTab.click();
    await expect(searchExamples.progressBar).toHaveAttribute('value', '0');

    await searchExamples.requestFibonacci.click();
    await expect(searchExamples.progressBar).not.toHaveAttribute('value', '0');
  });
});
