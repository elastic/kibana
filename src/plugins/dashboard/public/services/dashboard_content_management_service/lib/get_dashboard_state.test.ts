/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataService, embeddableService, savedObjectsTaggingService } from '../../kibana_services';
import { getSampleDashboardState } from '../../../mocks';
import { DashboardState } from '../../../dashboard_api/types';
import { getDashboardState } from './get_dashboard_state';

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

embeddableService.extract = jest
  .fn()
  .mockImplementation((attributes) => ({ state: attributes, references: [] }));

if (savedObjectsTaggingService) {
  savedObjectsTaggingService.getTaggingApi = jest.fn().mockReturnValue({
    ui: {
      updateTagsReferences: jest.fn((references, tags) => references),
    },
  });
}

describe('getDashboardState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the current state attributes and references', async () => {
    const currentState = getSampleDashboardState();
    const result = await getDashboardState({
      controlGroupReferences: [],
      generateNewIds: false,
      currentState,
      panelReferences: [],
    });

    expect(result.attributes.panels).toEqual([]);
    expect(result.references).toEqual([]);
  });

  it('should generate new IDs for panels and references when generateNewIds is true', async () => {
    const currentState = {
      ...getSampleDashboardState(),
      panels: { oldPanelId: { type: 'visualization' } },
    } as unknown as DashboardState;
    const result = await getDashboardState({
      controlGroupReferences: [],
      generateNewIds: true,
      currentState,
      panelReferences: [
        {
          name: 'oldPanelId:indexpattern_foobar',
          type: 'index-pattern',
          id: 'bizzbuzz',
        },
      ],
    });

    expect(result.attributes.panels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          panelIndex: expect.not.stringMatching('oldPanelId'),
          type: 'visualization',
        }),
      ])
    );
    expect(result.references).toEqual(
      expect.arrayContaining([
        {
          name: expect.not.stringMatching(/^oldPanelId:/),
          id: 'bizzbuzz',
          type: 'index-pattern',
        },
      ])
    );
  });

  it('should include control group references', async () => {
    const currentState = getSampleDashboardState();
    const controlGroupReferences = [
      { name: 'control1:indexpattern', type: 'index-pattern', id: 'foobar' },
    ];
    const result = await getDashboardState({
      controlGroupReferences,
      generateNewIds: false,
      currentState,
      panelReferences: [],
    });

    expect(result.references).toEqual(controlGroupReferences);
  });

  it('should include panel references', async () => {
    const currentState = getSampleDashboardState();
    const panelReferences = [
      { name: 'panel1:boogiewoogie', type: 'index-pattern', id: 'fizzbuzz' },
    ];
    const result = await getDashboardState({
      controlGroupReferences: [],
      generateNewIds: false,
      currentState,
      panelReferences,
    });

    expect(result.references).toEqual(panelReferences);
  });
});
