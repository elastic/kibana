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
    const state = {
      enhancements: {
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
      },
    };
    expect(transformEnhancementsOut(state)).toMatchInlineSnapshot(`
      Object {
        "drilldowns": Array [
          Object {
            "dashboardRefName": "drilldown:DASHBOARD_TO_DASHBOARD_DRILLDOWN:8aeddba7-a7ed-42e2-988e-794c8435028d:dashboardId",
            "label": "Go to Dashboard",
            "open_in_new_tab": false,
            "trigger": "FILTER_TRIGGER",
            "type": "dashboard_drilldown",
            "use_filters": true,
            "use_time_range": true,
          },
        ],
      }
    `);
  });

  test('should convert discover drilldown event', () => {
    const state = {
      enhancements: {
        dynamicActions: {
          events: [
            {
              action: {
                config: {
                  openInNewTab: false,
                },
                factoryId: 'OPEN_IN_DISCOVER_DRILLDOWN',
                name: 'Open in Discover',
              },
              eventId: '8b3b25b4-1691-4826-82c4-fb6c0478f669',
              triggers: ['FILTER_TRIGGER'],
            },
          ],
        },
      },
    };
    expect(transformEnhancementsOut(state)).toMatchInlineSnapshot(`
      Object {
        "drilldowns": Array [
          Object {
            "label": "Open in Discover",
            "open_in_new_tab": false,
            "trigger": "FILTER_TRIGGER",
            "type": "discover_drilldown",
          },
        ],
      }
    `);
  });

  test('should convert url drilldown event', () => {
    const state = {
      enhancements: {
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
      },
    };
    expect(transformEnhancementsOut(state)).toMatchInlineSnapshot(`
      Object {
        "drilldowns": Array [
          Object {
            "encode_url": true,
            "label": "Go to URL",
            "open_in_new_tab": true,
            "trigger": "VALUE_CLICK_TRIGGER",
            "type": "url_drilldown",
            "url": "https://localhost/?{{event.key}}",
          },
        ],
      }
    `);
  });

  test('should discard unknown events and preserve all other state keys', () => {
    const state = {
      enhancements: {
        dynamicActions: {
          events: [
            {
              action: {
                config: {
                  foo: 'hello',
                },
                factoryId: 'UNKNOWN_FACTORY',
                name: 'I am an unknown event',
              },
              eventId: '8b3b25b4-1691-4826-82c4-fb6c0478f669',
              triggers: ['FILTER_TRIGGER'],
            },
          ],
        },
      },
      // Should not remove other state keys
      someOtherKey: 'foo',
    };
    expect(transformEnhancementsOut(state)).toMatchInlineSnapshot(`
      Object {
        "someOtherKey": "foo",
      }
    `);
  });
});
