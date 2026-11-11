/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Coming back to Discover from another app replays the cached responses of its tabs while the
 * time picker selection and the pinned filters are the same.
 */

import { expect } from '@kbn/scout/ui';
import {
  spaceTest,
  DISCOVER_DEFAULT_KBN_ARCHIVE,
  DISCOVER_SEARCH_REQUESTS,
  RELATIVE_TIME_DEFAULTS,
  goToDashboards,
  refetchDiscover,
  waitForDiscoverResults,
} from '../fixtures';

spaceTest.describe('Discover replay cache', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
    await scoutSpace.savedObjects.load(DISCOVER_DEFAULT_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex('logstash-*');
    await scoutSpace.uiSettings.set({ 'timepicker:timeDefaults': RELATIVE_TIME_DEFAULTS });
  });

  spaceTest.beforeEach(async ({ browserAuth, page, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await waitForDiscoverResults(page, pageObjects.discover);
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'replays every tab that was loaded before leaving until an explicit refresh',
    async ({ page, pageObjects, network }) => {
      const { discover, unifiedTabs, collapsibleNav } = pageObjects;
      const hitCount = discover.getHitCountLocator();

      const firstTabHits = await spaceTest.step('loads a second tab', async () => {
        await refetchDiscover({ page, network, discover }, () => discover.createNewTabAndSearch());
        await unifiedTabs.selectTab(0);
        await waitForDiscoverResults(page, discover);
        return hitCount.innerText();
      });

      await spaceTest.step('returns to the cached tabs without search requests', async () => {
        await goToDashboards(page, collapsibleNav);

        const requestCount = await network.countMatchingRequests(
          DISCOVER_SEARCH_REQUESTS,
          async () => {
            await collapsibleNav.clickItem('Discover');
            await waitForDiscoverResults(page, discover);
            await expect(hitCount).toHaveText(firstTabHits);
            await unifiedTabs.selectTab(1);
            await waitForDiscoverResults(page, discover);
          }
        );

        expect(requestCount).toBe(0);
      });

      await spaceTest.step('loads fresh results on refresh', async () => {
        await refetchDiscover({ page, network, discover }, () => discover.submitQuery());
      });
    }
  );
});
