/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PinnedControlState } from '@kbn/controls-schemas';
import type { DashboardState } from '../../types';
import { transformDashboardIn } from './transform_dashboard_in';

jest.mock('../../../kibana_services', () => ({
  ...jest.requireActual('../../../kibana_services'),
  embeddableService: {
    getTransforms: jest.fn(),
  },
}));

describe('transformDashboardIn', () => {
  test('should transform dashboard state to saved object', () => {
    const dashboardState: DashboardState = {
      pinned_panels: [
        {
          config: { anyKey: 'some value' },
          grow: false,
          uid: 'foo',
          order: 0,
          type: 'type1',
          width: 'small',
        } as unknown as PinnedControlState,
      ],
      description: 'description',
      query: { query: 'test', language: 'KQL' },
      options: {
        hide_panel_titles: true,
        use_margins: false,
        sync_colors: false,
        sync_tooltips: false,
        sync_cursor: false,
        auto_apply_filters: true,
      },
      panels: [
        {
          grid: { x: 0, y: 0, w: 10, h: 10 },
          config: {
            enhancements: {},
            savedObjectId: '1',
          },
          uid: '1',
          title: 'title1',
          type: 'type1',
          version: '2',
        },
      ],
      tags: [],
      title: 'title',
      refresh_interval: { pause: true, value: 1000 },
      time_range: {
        from: 'now-15m',
        to: 'now',
      },
    };

    const output = transformDashboardIn(dashboardState);
    expect(output).toMatchInlineSnapshot(`
      Object {
        "attributes": Object {
          "controlGroupInput": Object {
            "panelsJSON": "{\\"foo\\":{\\"order\\":0,\\"type\\":\\"type1\\",\\"width\\":\\"small\\",\\"grow\\":false,\\"explicitInput\\":{\\"anyKey\\":\\"some value\\"}}}",
          },
          "description": "description",
          "kibanaSavedObjectMeta": Object {
            "searchSourceJSON": "{\\"query\\":{\\"query\\":\\"test\\",\\"language\\":\\"KQL\\"}}",
          },
          "optionsJSON": "{\\"hidePanelTitles\\":true,\\"useMargins\\":false,\\"syncColors\\":false,\\"syncTooltips\\":false,\\"syncCursor\\":false,\\"autoApplyFilters\\":true}",
          "panelsJSON": "[{\\"title\\":\\"title1\\",\\"type\\":\\"type1\\",\\"version\\":\\"2\\",\\"embeddableConfig\\":{\\"enhancements\\":{},\\"savedObjectId\\":\\"1\\"},\\"panelIndex\\":\\"1\\",\\"gridData\\":{\\"x\\":0,\\"y\\":0,\\"w\\":10,\\"h\\":10,\\"i\\":\\"1\\"}}]",
          "refreshInterval": Object {
            "pause": true,
            "value": 1000,
          },
          "timeFrom": "now-15m",
          "timeRestore": true,
          "timeTo": "now",
          "title": "title",
        },
        "error": null,
        "references": Array [],
      }
    `);
  });

  it('should not provide default values for optional properties', () => {
    const dashboardState: DashboardState = {
      title: 'title',
    };

    const output = transformDashboardIn(dashboardState);
    expect(output).toMatchInlineSnapshot(`
      Object {
        "attributes": Object {
          "description": "",
          "kibanaSavedObjectMeta": Object {
            "searchSourceJSON": "{}",
          },
          "optionsJSON": "{}",
          "panelsJSON": "",
          "timeRestore": false,
          "title": "title",
        },
        "error": null,
        "references": Array [],
      }
    `);
  });

  it('should transform project_routing to attributes', () => {
    const dashboardState: DashboardState = {
      title: 'title',
      project_routing: '_alias:_origin',
    };

    const output = transformDashboardIn(dashboardState);
    expect(output.error).toBeNull();
    expect(output.attributes?.projectRouting).toBe('_alias:_origin');
  });

  it('should not include projectRouting in attributes when it is undefined', () => {
    const dashboardState: DashboardState = {
      title: 'title',
    };

    const output = transformDashboardIn(dashboardState);
    expect(output.error).toBeNull();
    expect(output.attributes).not.toHaveProperty('projectRouting');
  });
});
