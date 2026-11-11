/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { NetworkFixture, PageObjects, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import type { DiscoverPage } from '../../../scout/common/ui/fixtures';

type SearchRequests = Parameters<NetworkFixture['trackMatchingRequests']>[0];

/** Search requests Discover sends in classic mode: one for the documents, one for the chart. */
export const DISCOVER_SEARCH_REQUESTS: SearchRequests = {
  endpoint: '/internal/search/ese',
  method: 'POST',
  exactPathname: true,
};

/** Search requests Discover sends in ES|QL mode: one for the documents, one for the chart. */
export const ESQL_SEARCH_REQUESTS: SearchRequests = {
  endpoint: '/internal/search/esql_async',
  method: 'POST',
  exactPathname: true,
};

/** Relative on purpose: a replay check that resolved "now" would miss on every return. */
export const RELATIVE_TIME_DEFAULTS = JSON.stringify({ from: 'now-30y', to: 'now' });

/** Waits until Discover rendered the documents and the chart of the current load. */
export const waitForDiscoverResults = async (page: ScoutPage, discover: DiscoverPage) => {
  await discover.waitUntilTabIsLoaded();
  await discover.waitForHistogramRendered();
  await page.testSubj.locator('unifiedHistogramProgressBar').waitFor({ state: 'hidden' });
};

/** Leaves Discover for the Dashboards app, so that coming back mounts Discover again. */
export const goToDashboards = async (
  page: ScoutPage,
  collapsibleNav: PageObjects['collapsibleNav']
) => {
  await collapsibleNav.clickItem('Dashboards');
  await expect(page.testSubj.locator('dashboardLandingPage')).toBeVisible();
};

/** Runs an action that refetches Discover and waits until its documents and chart are rendered. */
export const refetchDiscover = (
  {
    page,
    network,
    discover,
    requests = DISCOVER_SEARCH_REQUESTS,
  }: {
    page: ScoutPage;
    network: NetworkFixture;
    discover: DiscoverPage;
    requests?: SearchRequests;
  },
  action: () => Promise<void>
) =>
  network.trackMatchingRequests(requests, async (getCount) => {
    await action();
    await expect.poll(getCount, { timeout: 30_000 }).toBeGreaterThanOrEqual(2);
    await waitForDiscoverResults(page, discover);
  });
