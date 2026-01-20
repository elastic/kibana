/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transformEnhancementsOut } from './transform_enhancements_out';

describe('transformEnhancementsOut', () => {
  test('should convert dashboard drilldown event', () => {
    const enhancements = {
      dynamicActions: {
        events: [
          {
            action: {
              config: {
                openInNewTab: false,
                useCurrentDateRange: true,
                useCurrentFilters: true,
              },
              factoryId: 'DASHBOARD_TO_DASHBOARD_DRILLDOWN',
              name: 'Go to Dashboard',
            },
            eventId: '8aeddba7-a7ed-42e2-988e-794c8435028d',
            triggers: ['FILTER_TRIGGER'],
          },
        ],
      },
    };
    expect(transformEnhancementsOut(enhancements)).toMatchInlineSnapshot(`
      Array [
        Object {
          "config": Object {
            "dashboardRefName": "drilldown:DASHBOARD_TO_DASHBOARD_DRILLDOWN:8aeddba7-a7ed-42e2-988e-794c8435028d:dashboardId",
            "open_in_new_tab": false,
            "type": "dashboard_drilldown",
            "use_filters": true,
            "use_time_range": true,
          },
          "label": "Go to Dashboard",
          "triggers": Array [
            "FILTER_TRIGGER",
          ],
        },
      ]
    `);
  });
});
