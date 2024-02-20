/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getMockPresentationContainer } from '@kbn/presentation-containers/mocks';
import { getAddPanelActionMenuItems } from './add_panel_action_menu_items';

describe('getAddPanelActionMenuItems', () => {
  it('returns the items correctly', async () => {
    const registeredActions = [
      {
        id: 'ACTION_CREATE_ESQL_CHART',
        type: 'ACTION_CREATE_ESQL_CHART',
        getDisplayName: () => 'Action name',
        getIconType: () => 'pencil',
        getDisplayNameTooltip: () => 'Action tooltip',
        isCompatible: () => Promise.resolve(true),
        execute: jest.fn(),
      },
    ];
    const items = getAddPanelActionMenuItems(
      getMockPresentationContainer(),
      registeredActions,
      jest.fn()
    );
    expect(items).toStrictEqual([
      {
        'data-test-subj': 'create-action-Action name',
        icon: 'pencil',
        name: 'Action name',
        onClick: expect.any(Function),
        toolTipContent: 'Action tooltip',
      },
    ]);
  });

  it('returns empty array if no actions have been registered', async () => {
    const items = getAddPanelActionMenuItems(getMockPresentationContainer(), [], jest.fn());
    expect(items).toStrictEqual([]);
  });
});
