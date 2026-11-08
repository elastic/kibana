/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

spaceTest.describe('Data Views: Try ES|QL', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  // The no data views prompt shows because the worker's space starts without data views.
  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('navigates to Discover and presents an ES|QL query', async ({ page, pageObjects }) => {
    await page.gotoApp('management/kibana/dataViews');
    await pageObjects.dataViewsManagement.waitForListingPage();

    await page.testSubj.click('tryESQLLink');

    await pageObjects.discover.waitUntilTabIsLoaded();
    expect(await pageObjects.discover.getCurrentQueryMode()).toBe('esql');
    expect(await pageObjects.discover.getEsqlQueryValue()).toBe(
      'FROM logs* | SORT @timestamp DESC'
    );
  });
});
