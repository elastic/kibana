/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  DEFAULT_AUTO_APPLY_SELECTIONS,
  DEFAULT_CONTROLS_CHAINING,
  DEFAULT_CONTROL_GROW,
  DEFAULT_CONTROLS_LABEL_POSITION,
  DEFAULT_CONTROL_WIDTH,
  DEFAULT_IGNORE_PARENT_SETTINGS,
} from '@kbn/controls-constants';
import type {
  DashboardSavedObjectAttributes,
  SavedDashboardPanel,
} from '../../../../dashboard_saved_object';
import type { DashboardAttributes } from '../../types';
import { transformDashboardOut } from './transform_dashboard_out';
import { DEFAULT_DASHBOARD_OPTIONS } from '../../../../../common/content_management';

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

  test('should set default values if not provided', () => {
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
    expect(transformDashboardOut(input)).toEqual<DashboardAttributes>({
      controlGroupInput: {
        chainingSystem: DEFAULT_CONTROLS_CHAINING,
        labelPosition: DEFAULT_CONTROLS_LABEL_POSITION,
        ignoreParentSettings: DEFAULT_IGNORE_PARENT_SETTINGS,
        autoApplySelections: DEFAULT_AUTO_APPLY_SELECTIONS,
        controls: [
          {
            controlConfig: { anyKey: 'some value' },
            grow: DEFAULT_CONTROL_GROW,
            id: 'foo',
            order: 0,
            type: 'type1',
            width: DEFAULT_CONTROL_WIDTH,
          },
        ],
      },
      description: 'my description',
      kibanaSavedObjectMeta: {},
      options: {
        ...DEFAULT_DASHBOARD_OPTIONS,
        hidePanelTitles: false,
      },
      panels: [
        {
          config: {
            enhancements: {},
            savedObjectId: '1',
            title: 'title1',
          },
          grid: { x: 0, y: 0, w: 10, h: 10, i: '1' },
          uid: '1',
          type: 'type1',
          version: '2',
        },
      ],
      timeRestore: false,
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
        chainingSystem: 'NONE',
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
    expect(transformDashboardOut(input, references)).toEqual<DashboardAttributes>({
      controlGroupInput: {
        chainingSystem: 'NONE',
        labelPosition: 'twoLine',
        ignoreParentSettings: {
          ignoreFilters: true,
          ignoreQuery: false,
          ignoreTimerange: false,
          ignoreValidations: false,
        },
        autoApplySelections: false,
        controls: [
          {
            controlConfig: {
              anyKey: 'some value',
            },
            id: 'foo',
            grow: false,
            width: 'small',
            order: 0,
            type: 'type1',
          },
        ],
      },
      description: 'description',
      kibanaSavedObjectMeta: {
        searchSource: { query: { query: 'test', language: 'KQL' } },
      },
      options: {
        hidePanelTitles: true,
        useMargins: false,
        syncColors: false,
        syncTooltips: false,
        syncCursor: false,
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
            i: '1',
          },
          uid: '1',
          type: 'type1',
          version: '2',
        },
      ],
      refreshInterval: {
        pause: true,
        value: 1000,
      },
      tags: ['tag1', 'tag2'],
      timeRange: {
        from: 'now-15m',
        to: 'now',
      },
      timeRestore: true,
      title: 'title',
    });
  });
});
