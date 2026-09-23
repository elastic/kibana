/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomUUID } from 'crypto';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

spaceTest.describe('Discover search session lifecycle', { tag: '@local-stateful-classic' }, () => {
  const sourceDataViewName = `Session source ${randomUUID()}`;

  spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
    const { data: shakespeare } = await apiServices.dataViews.create({
      title: 'shakespeare',
      spaceId: scoutSpace.id,
    });
    await apiServices.dataViews.create({
      title: 'shakes*',
      name: sourceDataViewName,
      spaceId: scoutSpace.id,
    });
    await scoutSpace.uiSettings.set({
      defaultIndex: shakespeare.id,
      hideAnnouncements: true,
      'timepicker:refreshIntervalDefaults': JSON.stringify({ pause: true, value: 0 }),
    });
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects, sessionObserver }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.selectDataView('shakespeare', { createAdHocIfMissing: false });
    await pageObjects.discover.waitUntilTabIsLoaded();
    await expect.poll(() => sessionObserver.isAvailable()).toBe(true);
    await sessionObserver.clear();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset(
      'defaultIndex',
      'hideAnnouncements',
      'timepicker:refreshIntervalDefaults'
    );
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('Starts on index pattern select', async ({ pageObjects, sessionObserver }) => {
    await pageObjects.discover.selectDataView(sourceDataViewName, { createAdHocIfMissing: false });
    await pageObjects.discover.waitUntilTabIsLoaded();
    await sessionObserver.clear();

    await pageObjects.discover.selectDataView('shakespeare', { createAdHocIfMissing: false });
    await pageObjects.discover.waitUntilTabIsLoaded();
    await expect.poll(() => sessionObserver.getSessionIds()).toHaveLength(1);
  });

  spaceTest('Starts on a refresh', async ({ pageObjects, sessionObserver }) => {
    await pageObjects.discover.submitQueryAndWait();
    await expect.poll(() => sessionObserver.getSessionIds()).toHaveLength(1);
  });

  spaceTest('Starts a new session on sort', async ({ pageObjects, sessionObserver }) => {
    // Observe the entire add-column and sort sequence, as in the original FTR scenario.
    await pageObjects.dataGrid.addFieldFromSidebar('speaker');
    await pageObjects.dataGrid.sortColumn('speaker', 'Sort A-Z');
    await pageObjects.discover.waitUntilTabIsLoaded();
    await expect.poll(() => sessionObserver.getSessionIds()).toHaveLength(1);
  });

  spaceTest('Starts a new session on filter change', async ({ pageObjects, sessionObserver }) => {
    await pageObjects.dataGrid.addFieldFromSidebar('speaker');
    await pageObjects.dataGrid.sortColumn('speaker', 'Sort A-Z');
    await pageObjects.discover.waitUntilTabIsLoaded();
    await sessionObserver.clear();

    await pageObjects.filterBar.addFilter({
      field: 'line_number',
      operator: 'is',
      value: '4.3.108',
    });
    await pageObjects.discover.waitUntilTabIsLoaded();
    await expect.poll(() => sessionObserver.getSessionIds()).toHaveLength(1);
  });
});
