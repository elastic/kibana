/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PinnedControlState } from '@kbn/controls-schemas';
import type {
  DashboardSavedObjectAttributes,
  SavedDashboardPanel,
} from '../../../dashboard_saved_object';
import type { DashboardState } from '../../types';
import { transformDashboardOut } from './transform_dashboard_out';

jest.mock('../../../kibana_services', () => ({
  ...jest.requireActual('../../../kibana_services'),
  embeddableService: {
    getTransforms: jest.fn(),
  },
}));

describe('transformDashboardOut', () => {
  const controlGroupInputControlsSo = {
    explicitInput: { anyKey: 'some value' },
    type: 'type1',
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

  test('should not supply defaults for optional top level properties', () => {
    const input: DashboardSavedObjectAttributes = {
      description: '',
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{}',
      },
      optionsJSON: '{}',
      panelsJSON: '',
      timeRestore: false,
      title: 'my title',
    };
    expect(transformDashboardOut(input)).toEqual<DashboardState>({
      title: 'my title',
    });
  });

  test('should not supply defaults for optional nested properties', () => {
    const input: DashboardSavedObjectAttributes = {
      controlGroupInput: {
        panelsJSON: JSON.stringify({ foo: controlGroupInputControlsSo }),
      },
      panelsJSON: JSON.stringify(panelsSo),
      optionsJSON: JSON.stringify({
        hidePanelTitles: false,
      }),
      kibanaSavedObjectMeta: {},
      title: 'my title',
      description: 'my description',
    };
    expect(transformDashboardOut(input)).toEqual<DashboardState>({
      pinned_panels: [
        {
          config: { anyKey: 'some value' },
          uid: 'foo',
          type: 'type1',
        } as unknown as PinnedControlState,
      ],
      description: 'my description',
      options: {
        hide_panel_titles: false,
      },
      panels: [
        {
          config: {
            enhancements: {},
            savedObjectId: '1',
            title: 'title1',
          },
          grid: { x: 0, y: 0, w: 10, h: 10 },
          uid: '1',
          type: 'type1',
          version: '2',
        },
      ],
      title: 'my title',
    });
  });

  test('should transform full attributes correctly', () => {
    const input: DashboardSavedObjectAttributes = {
      controlGroupInput: {
        panelsJSON: JSON.stringify({
          foo: {
            ...controlGroupInputControlsSo,
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
    expect(transformDashboardOut(input, references)).toEqual<DashboardState>({
      pinned_panels: [
        {
          uid: 'foo',
          grow: false,
          width: 'small',
          config: {
            anyKey: 'some value',
          },
          type: 'type1',
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
        auto_apply_filters: false,
      },
      panels: [
        {
          config: {
            enhancements: {},
            savedObjectId: '1',
            title: 'title1',
          },
          grid: {
            x: 0,
            y: 0,
            w: 10,
            h: 10,
          },
          uid: '1',
          type: 'type1',
          version: '2',
        },
      ],
      refresh_interval: {
        pause: true,
        value: 1000,
      },
      tags: ['tag1', 'tag2'],
      time_range: {
        from: 'now-15m',
        to: 'now',
      },
      title: 'title',
    });
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
      const result = transformDashboardOut(input);
      expect(result.project_routing).toBe('_alias:_origin');
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
      const result = transformDashboardOut(input);
      expect(result.project_routing).toBeUndefined();
      expect(result).not.toHaveProperty('project_routing');
    });
  });
});
