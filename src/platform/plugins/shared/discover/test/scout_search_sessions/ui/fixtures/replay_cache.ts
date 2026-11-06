/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { NetworkFixture, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import type { DiscoverPage } from '../../../scout/common/ui/fixtures';

/** Search requests Discover sends in classic mode: one for the documents, one for the chart. */
export const DISCOVER_SEARCH_REQUESTS = {
  endpoint: '/internal/search/ese',
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

/** Runs an action that refetches Discover and waits until its documents and chart are rendered. */
export const refetchDiscover = (
  { page, network, discover }: { page: ScoutPage; network: NetworkFixture; discover: DiscoverPage },
  action: () => Promise<void>
) =>
  network.trackMatchingRequests(DISCOVER_SEARCH_REQUESTS, async (getCount) => {
    await action();
    await expect.poll(getCount, { timeout: 30_000 }).toBeGreaterThanOrEqual(2);
    await waitForDiscoverResults(page, discover);
  });
