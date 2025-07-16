/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardPanel } from '../../server';

import { dataService, savedObjectsTaggingService } from '../services/kibana_services';
import { getSampleDashboardState } from '../mocks';
import { getSerializedState } from './get_serialized_state';

dataService.search.searchSource.create = jest.fn().mockResolvedValue({
  setField: jest.fn(),
  getSerializedFields: jest.fn().mockReturnValue({}),
});

dataService.query.timefilter.timefilter.getTime = jest
  .fn()
  .mockReturnValue({ from: 'now-15m', to: 'now' });

dataService.query.timefilter.timefilter.getRefreshInterval = jest
  .fn()
  .mockReturnValue({ pause: true, value: 0 });

if (savedObjectsTaggingService) {
  savedObjectsTaggingService.getTaggingApi = jest.fn().mockReturnValue({
    ui: {
      updateTagsReferences: jest.fn((references, tags) => references),
    },
  });
}

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('54321'),
}));

describe('getSerializedState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the current state attributes and references', () => {
    const dashboardState = getSampleDashboardState();
    const result = getSerializedState({
      controlGroupReferences: [],
      generateNewIds: false,
      dashboardState,
      panelReferences: [],
      searchSourceReferences: [],
    });

    expect(result.attributes).toMatchInlineSnapshot(`
      Object {
        "controlGroupInput": undefined,
        "description": "",
        "kibanaSavedObjectMeta": Object {
          "searchSource": Object {
            "filter": Array [],
            "query": Object {
              "language": "kuery",
              "query": "hi",
            },
          },
        },
        "options": Object {
          "hidePanelTitles": false,
          "syncColors": false,
          "syncCursor": true,
          "syncTooltips": false,
          "useMargins": true,
        },
        "panels": Array [],
        "refreshInterval": undefined,
        "timeFrom": undefined,
        "timeRestore": false,
        "timeTo": undefined,
        "title": "My Dashboard",
        "version": 1,
      }
    `);
    expect(result.references).toEqual([]);
  });

  it('should generate new IDs for panels and references when generateNewIds is true', () => {
    const dashboardState = {
      ...getSampleDashboardState(),
      panels: [{ panelIndex: 'oldPanelId', type: 'visualization' } as DashboardPanel],
    };
    const result = getSerializedState({
      controlGroupReferences: [],
      generateNewIds: true,
      dashboardState,
      panelReferences: [
        {
          name: 'oldPanelId:indexpattern_foobar',
          type: 'index-pattern',
          id: 'bizzbuzz',
        },
      ],
      searchSourceReferences: [],
    });

    expect(result.attributes.panels).toMatchInlineSnapshot(`
      Array [
        Object {
          "gridData": Object {
            "i": "54321",
          },
          "panelIndex": "54321",
          "type": "visualization",
        },
      ]
    `);
    expect(result.references).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "bizzbuzz",
          "name": "54321:indexpattern_foobar",
          "type": "index-pattern",
        },
      ]
    `);
  });

  it('should include control group references', () => {
    const dashboardState = getSampleDashboardState();
    const controlGroupReferences = [
      { name: 'control1:indexpattern', type: 'index-pattern', id: 'foobar' },
    ];
    const result = getSerializedState({
      controlGroupReferences,
      generateNewIds: false,
      dashboardState,
      panelReferences: [],
      searchSourceReferences: [],
    });

    expect(result.references).toEqual(controlGroupReferences);
  });

  it('should include panel references', () => {
    const dashboardState = getSampleDashboardState();
    const panelReferences = [
      { name: 'panel1:boogiewoogie', type: 'index-pattern', id: 'fizzbuzz' },
    ];
    const result = getSerializedState({
      controlGroupReferences: [],
      generateNewIds: false,
      dashboardState,
      panelReferences,
      searchSourceReferences: [],
    });

    expect(result.references).toEqual(panelReferences);
  });
});
