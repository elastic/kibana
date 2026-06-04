/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Discover with ES data present but no custom data view, in a classic-solution
 * space: the default "All logs" data view is selected and the tabs bar shows.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const DEFAULT_LOGS_DATA_VIEW = 'All logs';

spaceTest.describe(
  'Discover - no custom data view (classic solution)',
  { tag: tags.stateful.all },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      // A fresh space defaults to classic, but set it explicitly so a reused
      // worker space is never left in a non-classic solution by another spec.
      await scoutSpace.setSolutionView('classic');
    });

    spaceTest.beforeEach(async ({ browserAuth, scoutSpace, pageObjects }) => {
      // Precondition: ES data exists (loaded in global.setup) but no custom data view.
      await scoutSpace.savedObjects.cleanStandardList();
      await browserAuth.loginAsPrivilegedUser();
      // Pin classic mode so the data-view-selector / tabs-bar assertions stay
      // valid even when the default Discover query mode is ES|QL.
      await pageObjects.discover.goto({ queryMode: 'classic' });
      await pageObjects.discover.waitUntilTabIsLoaded();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest('shows the tabs bar by default', async ({ pageObjects }) => {
      const { discover } = pageObjects;

      await expect(discover.getNoDataViewsPrompt()).toBeHidden();
      await expect.poll(() => discover.getSelectedDataViewName()).toBe(DEFAULT_LOGS_DATA_VIEW);
      await expect(discover.getTabsBar()).toBeVisible();
    });
  }
);
