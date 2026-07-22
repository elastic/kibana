/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../../fixtures/common';

spaceTest.describe('Discover tabs - inspector', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest('opens the inspector from the tab context menu', async ({ pageObjects }) => {
    const { inspector, unifiedTabs } = pageObjects;

    await unifiedTabs.openInspectorForActiveTab();
    await expect(inspector.panel).toBeVisible();
  });

  spaceTest('displays request stats in the inspector', async ({ pageObjects }) => {
    const { inspector, unifiedTabs } = pageObjects;

    await unifiedTabs.openInspectorForActiveTab();
    await inspector.openInspectorRequestsView();
    await inspector.requests.requestChooser.click();
    await inspector.requests.documentsRequest.click();
    await inspector.requests.statisticsTab.click();

    const requestStats = await inspector.getTableData();
    expect(requestStats.length).toBeGreaterThan(0);
  });
});
