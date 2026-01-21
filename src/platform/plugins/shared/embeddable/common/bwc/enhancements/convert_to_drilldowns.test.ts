/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { convertToDrilldowns } from './convert_to_drilldowns';

describe('convertToDrilldowns', () => {
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
    expect(convertToDrilldowns(enhancements)).toMatchInlineSnapshot(`
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

  test('should convert url drilldown event', () => {
    const enhancements = {
      dynamicActions: {
        events: [
          {
            action: {
              config: {
                encodeUrl: true,
                openInNewTab: true,
                url: {
                  template: 'https://localhost/?{{event.key}}',
                },
              },
              factoryId: 'URL_DRILLDOWN',
              name: 'Go to URL',
            },
            eventId: 'c29b72e0-8a32-4214-abe0-6c54c6f804b7',
            triggers: ['VALUE_CLICK_TRIGGER'],
          },
        ],
      },
    };
    expect(convertToDrilldowns(enhancements)).toMatchInlineSnapshot(`
      Array [
        Object {
          "config": Object {
            "encode_url": true,
            "open_in_new_tab": true,
            "type": "url_drilldown",
            "url": "https://localhost/?{{event.key}}",
          },
          "label": "Go to URL",
          "triggers": Array [
            "VALUE_CLICK_TRIGGER",
          ],
        },
      ]
    `);
  });
});
