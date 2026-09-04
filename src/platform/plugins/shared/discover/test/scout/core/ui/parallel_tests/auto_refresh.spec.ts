/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Auto-refresh issues a new search. The inspector request timestamp is the
 * rendered signal that a refetch happened.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../../common/ui/fixtures';

spaceTest.describe('auto refresh', { tag: tags.deploymentAgnostic }, () => {
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

  spaceTest('refetches when auto-refresh is enabled', async ({ pageObjects }) => {
    const { datePicker, discover, inspector } = pageObjects;

    await datePicker.startAutoRefresh(5);
    await discover.waitUntilTabIsLoaded();

    await discover.clickAppMenuItem('openInspectorButton');
    await inspector.openInspectorRequestsView();
    await inspector.openRequestsStatisticsTab();

    const requestTimestampBefore = await inspector.getRequestTimestamp();
    await expect(inspector.requests.timestamp).not.toHaveText(requestTimestampBefore);
  });
});
