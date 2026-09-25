/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData } from '../../../common/ui/fixtures';

const DASHBOARD_SAVED_SEARCH_ARCHIVE =
  'src/platform/test/functional/fixtures/kbn_archiver/dashboard/current/kibana';
const SAVED_SEARCH_NAME = 'Rendering Test: saved search';
const DEFAULT_TIME_RANGE = {
  from: '2015-09-22T00:00:00.000Z',
  to: '2015-09-23T00:00:00.000Z',
};

spaceTest.describe(
  'Discover session dashboard filter actions',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.load(DASHBOARD_SAVED_SEARCH_ARCHIVE);
      await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
      await scoutSpace.uiSettings.setDefaultTime(DEFAULT_TIME_RANGE);
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'propagates embeddable cell actions to the dashboard filter bar',
      async ({ pageObjects }) => {
        const { dashboard, dataGrid, filterBar } = pageObjects;

        await dashboard.openNewDashboard();
        await dashboard.addSavedSearch(SAVED_SEARCH_NAME);
        await dashboard.waitForRenderComplete();
        await dataGrid.waitForLoad();

        await dataGrid.filterCell({ rowIndex: 0, columnId: 'agent', mode: 'out' });
        await expect.poll(() => filterBar.getFilterCount()).toBe(1);

        await dataGrid.filterCell({ rowIndex: 0, columnId: 'agent', mode: 'for' });
        await expect.poll(() => filterBar.getFilterCount()).toBe(2);
      }
    );
  }
);
