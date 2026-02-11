/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { DASHBOARD_DEFAULT_INDEX_TITLE, DASHBOARD_SAVED_SEARCH_ARCHIVE } from '../constants';

const DASHBOARD_SAVED_SEARCH_NAME = 'Rendering-Test:-saved-search';
const DASHBOARD_TIME_RANGE = {
  from: 'Sep 22, 2015 @ 00:00:00.000',
  to: 'Sep 23, 2015 @ 00:00:00.000',
};

spaceTest.describe('Saved search panels (dashboard)', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(DASHBOARD_SAVED_SEARCH_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(DASHBOARD_DEFAULT_INDEX_TITLE);
    await scoutSpace.uiSettings.setDefaultTime(DASHBOARD_TIME_RANGE);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.dashboard.goto();
    await pageObjects.dashboard.openNewDashboard();

    // add saved search from library
    await addSavedSearchPanel(pageObjects);

    // verify saved search rows
    await expect
      .poll(async () => pageObjects.dashboard.getSavedSearchRowCount())
      .toBeGreaterThan(0);

    // verify initial library link
    const titles = await pageObjects.dashboard.getPanelTitles();
    expect(await pageObjects.dashboard.getPanelCount()).toBe(1);
    await pageObjects.dashboard.expectLinkedToLibrary(titles[0]);
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  const addSavedSearchPanel = async (pageObjects: { dashboard: any }) => {
    await pageObjects.dashboard.addSavedSearch(DASHBOARD_SAVED_SEARCH_NAME);
    await pageObjects.dashboard.waitForRenderComplete();
  };

  spaceTest('cloning saved search creates by-value panel', async ({ pageObjects }) => {
    await spaceTest.step('clone the panel', async () => {
      const titles = await pageObjects.dashboard.getPanelTitles();
      await pageObjects.dashboard.clonePanel(titles[0]);
    });

    await spaceTest.step('verify clone link state', async () => {
      const titles = await pageObjects.dashboard.getPanelTitles();
      expect(await pageObjects.dashboard.getPanelCount()).toBe(2);
      await pageObjects.dashboard.expectLinkedToLibrary(titles[0]);
      await pageObjects.dashboard.expectNotLinkedToLibrary(titles[1]);
    });
  });

  spaceTest('unlinking saved search makes it by value', async ({ pageObjects }) => {
    await spaceTest.step('unlink panel from library', async () => {
      const titles = await pageObjects.dashboard.getPanelTitles();
      await pageObjects.dashboard.unlinkFromLibrary(titles[0]);
    });

    await spaceTest.step('verify panel is by value', async () => {
      const titles = await pageObjects.dashboard.getPanelTitles();
      expect(await pageObjects.dashboard.getPanelCount()).toBe(1);
      await pageObjects.dashboard.expectNotLinkedToLibrary(titles[0]);
    });
  });
});
