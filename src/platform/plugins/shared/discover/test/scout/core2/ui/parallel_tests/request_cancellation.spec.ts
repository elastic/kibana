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

  spaceTest('allows cancelling active requests', async ({ page, pageObjects }) => {
    const { discover, filterBar } = pageObjects;

    await expect(discover.getQuerySubmitButton()).toBeVisible();
    await expect(discover.getQueryCancelButton()).toBeHidden();

    // Set up the listener before adding the filter to avoid a race condition where
    // the async search response arrives before we start listening.
    const asyncSearchResponsePromise = page.waitForResponse(
      (req) => req.url().includes('/internal/search/ese') && req.ok()
    );

    await filterBar.addDslFilter(STALLED_LOGSTASH_QUERY);

    // Wait for the first async search response to ensure the async ID is established in the
    // search interceptor. Without an ID, the interceptor cannot fetch partial results on cancel,
    // and the cancellation warning prompt would not appear.
    await asyncSearchResponsePromise;

    await expect(discover.getQueryCancelButton()).toBeVisible();
    await discover.getQueryCancelButton().click();

    await expect(discover.getSearchResponseWarningsEmptyPrompt()).toBeVisible();
    await expect(discover.getQuerySubmitButton()).toBeVisible();
    await expect(discover.getQueryCancelButton()).toBeHidden();
  });
});
