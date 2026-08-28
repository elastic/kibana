/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, tags, testData } from '../fixtures';

spaceTest.describe('Discover session panel interactions', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest('surfaces an invalid KQL error in a dashboard panel', async ({ page, pageObjects }) => {
    const { dashboard, discover, queryBar } = pageObjects;

    await dashboard.openNewDashboard();
    await dashboard.addSavedSearch(testData.SAVED_SEARCH_TITLE);
    await dashboard.waitForRenderComplete();

    await queryBar.setQuery('this < is not : a valid > query');
    await discover.submitQuery();

    await expect(page.testSubj.locator('embeddableError')).toBeVisible();
    await expect(page.testSubj.locator('errorMessageMarkdown')).toContainText(
      /Expected[\S\s]+but "n" found/
    );
  });
});
