/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  AddAggVisualizationPanelAction,
  ADD_AGG_VIS_ACTION_ID,
  type AddAggVisualizationPanelActionApi,
} from './add_agg_vis_action';
import type { BaseVisType } from '../vis_types/base_vis_type';
import { VisGroups } from '../vis_types/vis_groups_enum';
import { TypesService, type TypesStart } from '../vis_types/types_service';

const mockCompatibleEmbeddableAPI: AddAggVisualizationPanelActionApi = {
  type: ADD_AGG_VIS_ACTION_ID,
  addNewPanel: jest.fn(),
  getAppContext: jest.fn(),
};

describe('AddAggVisualizationPanelAction', () => {
  let typeServiceStart: TypesStart;

  beforeEach(() => {
    const typeService = new TypesService();

    typeServiceStart = typeService.start();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('invoking the compatibility function returns false when initialized with types that are not grouped as agg visualizations', async () => {
    jest.spyOn(typeServiceStart, 'all').mockReturnValue([]);

    const addAggVisualizationPanelAction = new AddAggVisualizationPanelAction(typeServiceStart);

    expect(
      await addAggVisualizationPanelAction.isCompatible({ embeddable: mockCompatibleEmbeddableAPI })
    ).toBe(false);
  });

  test('invoking the compatibility function returns true when the registered agg visualizations type does not have creation disabled', async () => {
    jest.spyOn(typeServiceStart, 'all').mockReturnValue([
      {
        group: VisGroups.AGGBASED,
        disableCreate: false,
        name: 'test visualization',
      } as BaseVisType,
    ]);

    const addAggVisualizationPanelAction = new AddAggVisualizationPanelAction(typeServiceStart);

    expect(
      await addAggVisualizationPanelAction.isCompatible({ embeddable: mockCompatibleEmbeddableAPI })
    ).toBe(true);
  });
});
