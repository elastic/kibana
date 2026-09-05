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

const STALLED_LOGSTASH_QUERY = JSON.stringify({
  error_query: {
    indices: [
      {
        error_type: 'none',
        name: 'logstash-*',
        stall_time_seconds: 30,
      },
    ],
  },
});

spaceTest.describe('Discover request cancellation', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeEach(async ({ browserAuth, discoverScoutSpace, pageObjects }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.selectDataView('logstash-*');
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterEach(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest('allows cancelling active requests', async ({ pageObjects }) => {
    const { discover, filterBar } = pageObjects;

    await expect(discover.getQuerySubmitButton()).toBeVisible();
    await expect(discover.getQueryCancelButton()).toBeHidden();

    await filterBar.addDslFilter(STALLED_LOGSTASH_QUERY);

    await expect(discover.getQueryCancelButton()).toBeVisible();
    await discover.getQueryCancelButton().click();

    await expect(discover.getSearchResponseWarningsEmptyPrompt()).toBeVisible();
    await expect(discover.getQuerySubmitButton()).toBeVisible();
    await expect(discover.getQueryCancelButton()).toBeHidden();
  });
});
