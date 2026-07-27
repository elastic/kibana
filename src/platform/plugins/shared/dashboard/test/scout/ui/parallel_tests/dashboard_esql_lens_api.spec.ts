/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LensApiConfig } from '@kbn/lens-embeddable-utils';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import type { RecursivePartial } from '@kbn/utility-types';
import type { DashboardState } from '../../../../common';
import {
  LENS_BASIC_KIBANA_ARCHIVE,
  LENS_BASIC_DATA_VIEW,
  LENS_BASIC_TIME_RANGE,
} from '../constants';

const ESQL_QUERY = 'FROM logstash-* | STATS count = COUNT(*) BY ts = BUCKET(@timestamp, 1 hour)';

const LOGSTASH_ABSOLUTE_RANGE = {
  from: '2015-09-19T06:31:44.000Z',
  to: '2015-09-23T18:31:44.000Z',
} as const;

function buildEsqlLensPanel() {
  const config: LensApiConfig = {
    type: 'xy',
    title: 'ES|QL Panel',
    layers: [
      {
        type: 'line',
        ignore_global_filters: false,
        sampling: 1,
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
    type: LENS_EMBEDDABLE_TYPE,
    grid: { x: 0, y: 0, w: 24, h: 15 },
    config,
  };
}

spaceTest.describe(
  'Dashboard with ES|QL Lens panel via API',
  { tag: tags.deploymentAgnostic },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.load(LENS_BASIC_KIBANA_ARCHIVE);
      await scoutSpace.uiSettings.setDefaultIndex(LENS_BASIC_DATA_VIEW);
      await scoutSpace.uiSettings.setDefaultTime(LENS_BASIC_TIME_RANGE);
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'creates and loads a dashboard with an ES|QL Lens panel',
      async ({ page, apiServices, scoutSpace, pageObjects, network }) => {
        const title = `ES|QL Lens Dashboard ${Date.now()}`;

        const dashboardId = await apiServices.dashboard.create(
          {
            title,
            time_range: {
              from: LOGSTASH_ABSOLUTE_RANGE.from,
              to: LOGSTASH_ABSOLUTE_RANGE.to,
              mode: 'absolute' as const,
            },
            panels: [buildEsqlLensPanel()],
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
                          stall_time_seconds: 10,
                        },
                      ],
                    },
                  },
                },
              },
            ],
          } as RecursivePartial<DashboardState>,
          scoutSpace.id
        );

        await pageObjects.dashboard.openDashboardWithId(dashboardId, false);

        // panel creates a search
        await page.waitForRequest(
          (req) => req.url().endsWith('/esql_async') && req.method() === 'POST'
        );

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
