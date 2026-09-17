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
import { waitForRequestCount } from '../helpers/request_counts_shared';

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

const STALLED_LOGSTASH_WARNING_QUERY = JSON.stringify({
  error_query: {
    indices: [
      {
        error_type: 'warning',
        message: "'Fake slow request'",
        name: '*',
        stall_time_seconds: 5,
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

  spaceTest(
    'recovers when a newer time range aborts an active request',
    async ({ page, pageObjects, network }) => {
      const { datePicker, discover, filterBar } = pageObjects;
      const reducedRange = {
        from: 'Sep 20, 2015 @ 00:00:00.000',
        to: 'Sep 20, 2015 @ 23:50:13.253',
      };

      await discover.waitUntilSearchingHasFinished();

      const stalledSearchResponse = page.waitForResponse((response) => {
        try {
          return (
            new URL(response.url()).pathname.endsWith('/internal/search/ese') &&
            response.request().method() === 'POST' &&
            response.ok()
          );
        } catch {
          return false;
        }
      });
      await filterBar.addDslFilter(STALLED_LOGSTASH_WARNING_QUERY);
      const stalledBody = await (await stalledSearchResponse).json();
      expect(stalledBody.id).toBeTruthy();
      await expect(discover.getQueryCancelButton()).toBeVisible();
      await expect(page.testSubj.locator('discoverDataGridUpdating')).toBeVisible();

      expect(
        await network.trackMatchingRequests(
          { endpoint: '/internal/search/ese', method: 'DELETE' },
          async (getCount) => {
            await datePicker.setAbsoluteRange(reducedRange);
            // Discover aborts the previous search from fetch$, which runs after
            // the date picker closes — keep listening until the DELETE arrives.
            await waitForRequestCount(getCount, 1);
          }
        )
      ).toBeGreaterThan(0);
      await discover.waitUntilSearchingHasFinished();

      await expect(discover.getHistogramChart()).toBeVisible();
      await expect(discover.getHitCountLocator()).toHaveText('4,756');
      await expect(discover.getQueryCancelButton()).toBeHidden();
    }
  );
});
