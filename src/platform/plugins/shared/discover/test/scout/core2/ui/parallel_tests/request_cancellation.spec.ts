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
    // Once the cancelled request has settled, the controls that were locked are usable again
    await expect(page.testSubj.locator('addFilter')).toBeEnabled();
  });

  spaceTest(
    'locks the controls that start a new search until the active request settles',
    async ({ page, pageObjects }) => {
      const { discover, filterBar } = pageObjects;
      const datePickerControl = page.testSubj
        .locator('dateRangePickerControlButton')
        .or(page.testSubj.locator('superDatePickerToggleQuickMenuButton'));
      const addFilterButton = page.testSubj.locator('addFilter');
      const queryBarMenuButton = page.testSubj.locator('showQueryBarMenu');
      const dataViewPickerButton = page.testSubj.locator('discover-dataView-switch-link');
      const filterActionsButton = page.getByRole('button', { name: 'Filter actions' });

      await discover.waitUntilSearchingHasFinished();
      await expect(datePickerControl).toBeEnabled();
      await expect(addFilterButton).toBeEnabled();

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
      await stalledSearchResponse;
      await expect(discover.getQueryCancelButton()).toBeVisible();
      await expect(page.testSubj.locator('discoverDataGridUpdating')).toBeVisible();

      // A newer search can't start while this one is in flight
      await expect(datePickerControl).toBeDisabled();
      await expect(addFilterButton).toBeDisabled();
      await expect(queryBarMenuButton).toBeDisabled();
      await expect(dataViewPickerButton).toBeDisabled();
      await expect(filterActionsButton).toBeHidden();
      // Editing the query doesn't emit new state, so it stays available
      await expect(page.testSubj.locator('queryInput')).toBeEnabled();

      await discover.waitUntilSearchingHasFinished();

      await expect(discover.getQueryCancelButton()).toBeHidden();
      await expect(datePickerControl).toBeEnabled();
      await expect(addFilterButton).toBeEnabled();
      await expect(queryBarMenuButton).toBeEnabled();
      await expect(dataViewPickerButton).toBeEnabled();
      await expect(filterActionsButton).toBeVisible();
    }
  );
});
