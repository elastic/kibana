/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test } from '@kbn/scout';

const LOGSTASH_ARCHIVE = 'x-pack/platform/test/fixtures/es_archives/logstash_functional';
const ESQL_QUERY = 'FROM logstash-* | STATS count = COUNT(*) BY ts = BUCKET(@timestamp, 1 hour)';
const DATA_VIEW_ID = 'logstash-*';
const TIME_RANGE = {
  from: 'Sep 19, 2015 @ 06:31:44.000',
  to: 'Sep 23, 2015 @ 18:31:44.000',
};

function buildEsqlLensPanel() {
  const config = {
    type: 'xy',
    title: 'ES|QL Panel',
    layers: [
      {
        type: 'line',
        data_source: {
          type: 'esql',
          query: ESQL_QUERY,
        },
        x: { column: 'ts' },
        y: [{ column: 'count' }],
      },
    ],
  };

  return {
    type: 'vis',
    grid: { x: 0, y: 0, w: 24, h: 15 },
    config,
  };
}

function buildClassicLensPanel() {
  const config = {
    type: 'xy',
    title: 'Classic Panel',
    layers: [
      {
        type: 'line',
        data_source: {
          type: 'data_view_spec',
          index_pattern: DATA_VIEW_ID,
          time_field: '@timestamp',
        },
        x: {
          operation: 'date_histogram',
          field: '@timestamp',
        },
        y: [{ operation: 'count' }],
      },
    ],
  };

  return {
    type: 'vis',
    grid: { x: 0, y: 15, w: 24, h: 15 },
    config,
  };
}

test.describe(
  'Async search cancellation on browser navigation',
  { tag: '@local-stateful-classic' },
  () => {
    test.beforeAll(async ({ esArchiver }) => {
      await esArchiver.loadIfNeeded(LOGSTASH_ARCHIVE);
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    test.afterAll(async ({ kbnClient }) => {
      await kbnClient.savedObjects.cleanStandardList();
    });

    test('cancels both ES|QL and classic ES searches when navigating away from dashboard', async ({
      page,
      apiServices,
      pageObjects,
    }) => {
      const dashboardId = await apiServices.dashboard.create({
        title: `Cancel Test Dashboard ${Date.now()}`,
        time_range: { ...TIME_RANGE, mode: 'absolute' as const },
        panels: [buildEsqlLensPanel(), buildClassicLensPanel()],
        filters: [
          {
            type: 'dsl',
            dsl: {
              query: {
                error_query: {
                  indices: [
                    {
                      name: '*',
                      error_type: 'warning',
                      message: "'Watch out!'",
                      stall_time_seconds: 5,
                    },
                  ],
                },
              },
            },
          },
        ],
      });

      // Set up listeners before opening the dashboard to avoid race conditions
      const searchInitiationPromises = [
        page.waitForResponse((res) => res.url().endsWith('/esql_async') && res.ok()),
        page.waitForResponse((res) => res.url().endsWith('/ese') && res.ok()),
      ];

      // Open dashboard without waiting for render since queries are stalled
      await pageObjects.dashboard.openDashboardWithId(dashboardId, { waitForRender: false });

      await Promise.all(searchInitiationPromises);

      // Set up DELETE request listeners before triggering navigation
      const cancelRequestPromises = [
        page.waitForRequest(
          (req) => req.url().includes('/esql_async') && req.method() === 'DELETE'
        ),
        page.waitForRequest((req) => req.url().includes('/ese') && req.method() === 'DELETE'),
      ];

      // browser navigation triggers beforeunload which cancels in-flight searches;
      await page.reload();

      await Promise.all([...cancelRequestPromises]);
    });
  }
);
