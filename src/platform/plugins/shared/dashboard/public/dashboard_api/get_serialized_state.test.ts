/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataService } from '../services/kibana_services';
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
      dashboardState,
      panelReferences: [],
    });

    expect(result.attributes).toMatchInlineSnapshot(`
      Object {
        "controlGroupInput": undefined,
        "description": "",
        "filters": Array [],
        "options": Object {
          "hidePanelTitles": false,
          "syncColors": false,
          "syncCursor": true,
          "syncTooltips": false,
          "useMargins": true,
        },
        "panels": Array [],
        "query": Object {
          "language": "kuery",
          "query": "hi",
        },
        "refreshInterval": undefined,
        "tags": Array [],
        "timeRange": undefined,
        "timeRestore": false,
        "title": "My Dashboard",
        "version": 1,
      }
    `);
    expect(result.references).toEqual([]);
  });

  it('should include control group references', () => {
    const dashboardState = getSampleDashboardState();
    const controlGroupReferences = [
      { name: 'control1:indexpattern', type: 'index-pattern', id: 'foobar' },
    ];
    const result = getSerializedState({
      controlGroupReferences,
      dashboardState,
      panelReferences: [],
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
      dashboardState,
      panelReferences,
    });

    expect(result.references).toEqual(panelReferences);
  });
});
