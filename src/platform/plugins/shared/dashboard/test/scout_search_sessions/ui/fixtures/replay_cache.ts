/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardApiDataInput } from '@kbn/as-code-dashboard-schema';
import type { NetworkFixture, PageObjects, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { createMetricPanel } from '../../../scout/ui/metric_panel';

export const REPLAY_CACHE_DASHBOARD = 'Replay cache';

/** Searches of every strategy: Lens DSL and ES|QL panels, the ES|QL control and the range slider. */
const SEARCH_REQUESTS = { endpoint: '/internal/search/', method: 'POST' } as const;

/** One search for each panel and control of the dashboard. */
const SEARCHES_PER_LOAD = 4;

/** A dashboard with every source the replay cache covers, on a relative time range. */
export const getReplayCacheDashboard = (dataViewId: string): DashboardApiDataInput => ({
  title: REPLAY_CACHE_DASHBOARD,
  // Relative on purpose: a return that resolved "now" again would never replay.
  time_range: { from: 'now-30y', to: 'now', mode: 'relative' },
  panels: [
    createMetricPanel('logstash-*'),
    {
      type: 'vis',
      grid: { x: 24, y: 0, w: 24, h: 10 },
      config: {
        type: 'metric',
        data_source: {
          type: 'esql',
          query:
            'FROM logstash-* | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend | STATS docs = COUNT(*)',
        },
        metrics: [{ type: 'primary', column: 'docs' }],
      },
    },
  ],
  pinned_panels: [
    {
      type: 'esql_control',
      width: 'medium',
      grow: false,
      config: {
        control_type: 'VALUES_FROM_QUERY',
        esql_query: 'FROM logstash-* | WHERE @timestamp >= ?_tstart | STATS BY machine.os.raw',
        selected_options: [],
        single_select: true,
        title: 'os',
        variable_name: 'os',
        variable_type: 'values',
      },
    },
    {
      type: 'range_slider_control',
      width: 'medium',
      grow: false,
      config: { data_view_id: dataViewId, field_name: 'bytes', title: 'bytes' },
    },
  ],
});

/** Runs an action that starts a new session and waits until every panel and control loaded again. */
export const refetchDashboard = (
  dashboard: PageObjects['dashboard'],
  network: NetworkFixture,
  action: () => Promise<void>
) =>
  network.trackMatchingRequests(SEARCH_REQUESTS, async (getCount) => {
    await action();
    await expect.poll(getCount).toBeGreaterThanOrEqual(SEARCHES_PER_LOAD);
    await dashboard.waitForRenderComplete();
  });

/** Leaves for the listing and opens the dashboard again, without the reload that empties the cache. */
export const countSearchesOnReturn = async (
  dashboard: PageObjects['dashboard'],
  network: NetworkFixture
) => {
  await dashboard.navigateToListingFromCurrentDashboard();
  return network.countMatchingRequests(SEARCH_REQUESTS, async () => {
    await dashboard.getDashboardListingLink(REPLAY_CACHE_DASHBOARD).click();
    await dashboard.waitForRenderComplete();
  });
};

/** What the dashboard shows: the metric values, the ES|QL control options and the slider bounds. */
export const readResults = async (page: ScoutPage, controls: PageObjects['controls']) => {
  const metrics = page.testSubj.locator('mtrVis');
  const lowerBound = page.testSubj.locator('rangeSlider__lowerBoundFieldNumber');
  const upperBound = page.testSubj.locator('rangeSlider__upperBoundFieldNumber');
  await expect(metrics).toHaveText([/\d/, /\d/]);

  const [esqlControlId] = await controls.getControlIds();
  await controls.optionsList.openPopover(esqlControlId);
  const optionRows = page.testSubj
    .locator('optionsList-control-available-options')
    .getByRole('option');
  await expect(optionRows).not.toHaveCount(0);
  const options = await optionRows.allTextContents();
  await controls.optionsList.ensurePopoverIsClosed();

  return {
    metrics: await metrics.allTextContents(),
    options: options.sort(),
    min: await lowerBound.getAttribute('placeholder'),
    max: await upperBound.getAttribute('placeholder'),
  };
};
