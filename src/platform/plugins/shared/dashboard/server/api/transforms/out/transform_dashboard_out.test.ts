/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TIME_SLIDER_CONTROL } from '@kbn/controls-constants';
import { timeSliderControlSchema } from '@kbn/controls-schemas';

import { DEFAULT_DASHBOARD_STATE } from '../../../../common/default_dashboard_state';
import type {
  DashboardSavedObjectAttributes,
  SavedDashboardPanel,
} from '../../../dashboard_saved_object';
import { getDashboardStateSchema } from '../../dashboard_state_schemas';
import { transformDashboardOut } from './transform_dashboard_out';
import { createEmbeddableSetupMock } from '@kbn/embeddable-plugin/server/mocks';
import { setStubKibanaServices } from '../../../mocks';

const embeddable = createEmbeddableSetupMock();
embeddable.registerEmbeddableServerDefinition(TIME_SLIDER_CONTROL, {
  title: 'Time slider control',
  getSchema: () => {
    return timeSliderControlSchema;
  },
  getTransforms: () => {
    return {
      transformOut: jest.fn().mockImplementation((val) => val),
      schema: timeSliderControlSchema,
    };
  },
});

describe('transformDashboardOut', () => {
  beforeAll(() => {
    setStubKibanaServices();
  });

  const pinnedPanelSo = {
    config: {},
    type: 'time_slider_control',
    order: 0,
  };

  const panelsSo: SavedDashboardPanel[] = [
    {
      embeddableConfig: { enhancements: {} },
      gridData: { x: 0, y: 0, w: 10, h: 10, i: '1' },
      id: '1',
      panelIndex: '1',
      title: 'title1',
      type: 'type1',
      version: '2',
    },
  ];

  test('should supply defaults', () => {
    const input: Partial<DashboardSavedObjectAttributes> = {
      title: 'my title',
    };
    expect(transformDashboardOut(input, undefined, undefined, getDashboardStateSchema(false)))
      .toMatchInlineSnapshot(`
      Object {
        "dashboardState": Object {
          "options": Object {
${JSON.stringify(DEFAULT_DASHBOARD_STATE.options, null, '.')
  .slice(2, -2)
  .replaceAll('.', ' '.repeat(12))},
          },
          "panels": Array [],
          "pinned_panels": Array [],
          "tags": Array [],
          "title": "my title",
        },
        "warnings": Array [],
      }
    `);
  });

  test('should transform full attributes correctly', () => {
    const input: DashboardSavedObjectAttributes = {
      pinned_panels: {
        panels: {
          foo: {
            ...pinnedPanelSo,
            grow: false,
            width: 'small',
          },
        },
      },
      description: 'description',
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify({ query: { query: 'test', language: 'KQL' } }),
      },
      optionsJSON: JSON.stringify({
        autoApplyFilters: false,
        hidePanelTitles: true,
        useMargins: false,
        syncColors: false,
        syncTooltips: false,
        syncCursor: false,
      }),
      panelsJSON: JSON.stringify(panelsSo),
      refreshInterval: { pause: true, value: 1000 },
      timeFrom: 'now-15m',
      timeRestore: true,
      timeTo: 'now',
      title: 'title',
    };
    const references = [
      {
        type: 'tag',
        id: 'tag1',
        name: 'tag-ref-tag1',
      },
      {
        type: 'tag',
        id: 'tag2',
        name: 'tag-ref-tag2',
      },
      {
        type: 'index-pattern',
        id: 'index-pattern1',
        name: 'index-pattern-ref-index-pattern1',
      },
    ];
    expect(transformDashboardOut(input, references, undefined, getDashboardStateSchema(false)))
      .toMatchInlineSnapshot(`
      Object {
        "dashboardState": Object {
          "description": "description",
          "filters": Array [],
          "options": Object {
            "auto_apply_filters": false,
            "hide_panel_borders": false,
            "hide_panel_titles": true,
            "sync_colors": false,
            "sync_cursor": false,
            "sync_tooltips": false,
            "use_margins": false,
          },
          "panels": Array [
            Object {
              "config": Object {
                "enhancements": Object {},
                "title": "title1",
              },
              "grid": Object {
                "h": 10,
                "w": 10,
                "x": 0,
                "y": 0,
              },
              "id": "1",
              "type": "type1",
            },
          ],
          "pinned_panels": Array [
            Object {
              "config": Object {
                "end_percentage_of_time_range": 1,
                "is_anchored": false,
                "start_percentage_of_time_range": 0,
              },
              "grow": false,
              "id": "foo",
              "type": "time_slider_control",
              "width": "small",
            },
          ],
          "query": Object {
            "expression": "test",
            "language": "kql",
          },
          "refresh_interval": Object {
            "pause": true,
            "value": 1000,
          },
          "tags": Array [
            "tag1",
            "tag2",
          ],
          "time_range": Object {
            "from": "now-15m",
            "to": "now",
          },
          "title": "title",
        },
        "warnings": Array [],
      }
    `);
  });

  test('should transform <9.4 legacy attributes correctly', () => {
    const input: DashboardSavedObjectAttributes = {
      controlGroupInput: {
        panelsJSON: JSON.stringify({
          foo: {
            ...pinnedPanelSo,
            grow: false,
            width: 'small',
          },
        }),
        ignoreParentSettingsJSON: JSON.stringify({ ignoreFilters: true }),
        controlStyle: 'twoLine',
        showApplySelections: true,
      },
      description: 'description',
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify({ query: { query: 'test', language: 'KQL' } }),
      },
      optionsJSON: JSON.stringify({
        hidePanelTitles: true,
        useMargins: false,
        syncColors: false,
        syncTooltips: false,
        syncCursor: false,
      }),
      panelsJSON: JSON.stringify(panelsSo),
      title: 'title',
    };
    const references = [
      {
        type: 'index-pattern',
        id: 'index-pattern1',
        name: 'index-pattern-ref-index-pattern1',
      },
    ];
    expect(transformDashboardOut(input, references, undefined, getDashboardStateSchema(false)))
      .toMatchInlineSnapshot(`
      Object {
        "dashboardState": Object {
          "description": "description",
          "filters": Array [],
          "options": Object {
            "auto_apply_filters": false,
            "hide_panel_borders": false,
            "hide_panel_titles": true,
            "sync_colors": false,
            "sync_cursor": false,
            "sync_tooltips": false,
            "use_margins": false,
          },
          "panels": Array [
            Object {
              "config": Object {
                "enhancements": Object {},
                "title": "title1",
              },
              "grid": Object {
                "h": 10,
                "w": 10,
                "x": 0,
                "y": 0,
              },
              "id": "1",
              "type": "type1",
            },
          ],
          "pinned_panels": Array [
            Object {
              "config": Object {
                "end_percentage_of_time_range": 1,
                "is_anchored": false,
                "start_percentage_of_time_range": 0,
              },
              "grow": false,
              "id": "foo",
              "type": "time_slider_control",
              "width": "small",
            },
          ],
          "query": Object {
            "expression": "test",
            "language": "kql",
          },
          "tags": Array [],
          "title": "title",
        },
        "warnings": Array [],
      }
    `);
  });

  describe('project_routing', () => {
    test('should include project_routing when it is a string', () => {
      const input: DashboardSavedObjectAttributes = {
        panelsJSON: JSON.stringify([]),
        optionsJSON: JSON.stringify({}),
        kibanaSavedObjectMeta: {},
        title: 'my title',
        description: 'my description',
        projectRouting: '_alias:_origin',
      };
      const { dashboardState } = transformDashboardOut(
        input,
        undefined,
        undefined,
        getDashboardStateSchema(false)
      );
      expect(dashboardState.project_routing).toBe('_alias:_origin');
    });

    test('should not include project_routing when it is undefined', () => {
      const input: DashboardSavedObjectAttributes = {
        panelsJSON: JSON.stringify([]),
        optionsJSON: JSON.stringify({}),
        kibanaSavedObjectMeta: {},
        title: 'my title',
        description: 'my description',
        // projectRouting is undefined
      };
      const { dashboardState } = transformDashboardOut(
        input,
        undefined,
        undefined,
        getDashboardStateSchema(false)
      );
      expect(dashboardState.project_routing).toBeUndefined();
      expect(dashboardState).not.toHaveProperty('project_routing');
    });
  });

  describe('esql_approximation', () => {
    test('should map esqlApproximation attribute to esql_approximation in dashboardState', () => {
      const input: DashboardSavedObjectAttributes = {
        panelsJSON: JSON.stringify([]),
        optionsJSON: JSON.stringify({}),
        kibanaSavedObjectMeta: {},
        title: 'my title',
        description: 'my description',
        esqlApproximation: true,
      };
      const { dashboardState } = transformDashboardOut(
        input,
        undefined,
        undefined,
        getDashboardStateSchema(false)
      );
      expect(dashboardState.esql_approximation).toBe(true);
    });

    test('should not include esql_approximation when esqlApproximation attribute is undefined', () => {
      const input: DashboardSavedObjectAttributes = {
        panelsJSON: JSON.stringify([]),
        optionsJSON: JSON.stringify({}),
        kibanaSavedObjectMeta: {},
        title: 'my title',
        description: 'my description',
      };
      const { dashboardState } = transformDashboardOut(
        input,
        undefined,
        undefined,
        getDashboardStateSchema(false)
      );
      expect(dashboardState).not.toHaveProperty('esql_approximation');
    });
  });
});
