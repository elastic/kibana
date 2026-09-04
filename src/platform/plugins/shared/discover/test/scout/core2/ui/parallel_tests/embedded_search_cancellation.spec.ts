/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SEARCH_EMBEDDABLE_TYPE } from '@kbn/discover-utils';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

const LOGSTASH_ABSOLUTE_RANGE = {
  from: '2015-09-19T06:31:44.000Z',
  to: '2015-09-23T18:31:44.000Z',
} as const;

spaceTest.describe(
  'Discover session embedded in dashboard - request cancellation',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest(
      'cancels async search when navigating away from the dashboard',
      async ({ page, apiServices, scoutSpace, pageObjects, network }) => {
        const title = `Discover Session Dashboard ${Date.now()}`;

        const dashboardId = await apiServices.dashboard.create(
          {
            title,
            time_range: {
              from: LOGSTASH_ABSOLUTE_RANGE.from,
              to: LOGSTASH_ABSOLUTE_RANGE.to,
              mode: 'absolute',
            },
            panels: [
              {
                type: SEARCH_EMBEDDABLE_TYPE,
                grid: { x: 0, y: 0, w: 24, h: 15 },
                config: {
                  tabs: [
                    {
                      data_source: {
                        type: 'esql',
                        query: 'FROM logstash-* | LIMIT 10',
                      },
                    },
                  ],
                },
              },
            ],
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
          },
          scoutSpace.id
        );

        // Set up listener before opening the dashboard to avoid race conditions
        const esqlRequestPromise = page.waitForResponse(
          (req) => req.url().endsWith('/esql_async') && req.ok()
        );
        await pageObjects.dashboard.openDashboardWithId(dashboardId, { waitForRender: false });
        await esqlRequestPromise;

        expect(
          await network.countMatchingRequests(
            { endpoint: '/esql_async', method: 'DELETE' },
            async () => {
              await pageObjects.collapsibleNav.clickItem('Discover');
            }
          )
        ).toBe(1);
      }
    );
  }
);
