/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import {
  spaceTest,
  DISCOVER_DEFAULT_KBN_ARCHIVE,
  ESQL_SEARCH_REQUESTS,
  RELATIVE_TIME_DEFAULTS,
  refetchDiscover,
  waitForDiscoverResults,
} from '../fixtures';

const QUERY = 'FROM logstash-* | SORT @timestamp DESC | LIMIT 100';

spaceTest.describe('Discover ES|QL replay cache', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
    await scoutSpace.savedObjects.load(DISCOVER_DEFAULT_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex('logstash-*');
    await scoutSpace.uiSettings.set({
      enableESQL: true,
      'timepicker:timeDefaults': RELATIVE_TIME_DEFAULTS,
    });
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'enableESQL', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'replays documents and the chart until an explicit refresh',
    async ({ page, pageObjects, network }) => {
      const { discover, collapsibleNav } = pageObjects;

      await spaceTest.step('loads the query and chart', async () => {
        await discover.goto({ queryMode: 'esql' });
        await discover.waitUntilTabIsLoaded();
        await discover.writeAndSubmitEsqlQuery(QUERY);
        await waitForDiscoverResults(page, discover);

        await expect(discover.getHitCountLocator()).toHaveText('100');
      });

      await spaceTest.step('returns to the cached results without search requests', async () => {
        await collapsibleNav.clickItem('Dashboards');
        await expect(page.testSubj.locator('dashboardLandingPage')).toBeVisible();

        const requestCount = await network.countMatchingRequests(ESQL_SEARCH_REQUESTS, async () => {
          await collapsibleNav.clickItem('Discover');
          await waitForDiscoverResults(page, discover);
        });

        expect(requestCount).toBe(0);
        expect(await discover.getEsqlQueryValue()).toBe(QUERY);
        await expect(discover.getHitCountLocator()).toHaveText('100');
      });

      await spaceTest.step('fetches documents and the chart again on refresh', async () => {
        const requestCount = await refetchDiscover(
          { page, network, discover, requests: ESQL_SEARCH_REQUESTS },
          () => discover.submitQuery()
        );

        expect(requestCount).toBeGreaterThanOrEqual(2);
        await expect(discover.getHitCountLocator()).toHaveText('100');
      });
    }
  );
});
