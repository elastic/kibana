/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { PresentationContainer } from '@kbn/presentation-containers';
import { GroupedAddPanelActions } from './add_panel_action_menu_items';
import {
  FactoryGroup,
  mergeGroupedItemsProvider,
  getEmbeddableFactoryMenuItemProvider,
} from './editor_menu';

describe('mergeGroupedItemsProvider', () => {
  const mockApi = { addNewPanel: jest.fn() } as unknown as jest.Mocked<PresentationContainer>;
  const closePopoverSpy = jest.fn();

  const getEmbeddableFactoryMenuItem = getEmbeddableFactoryMenuItemProvider(
    mockApi,
    closePopoverSpy
  );

  const mockFactory = {
    id: 'factory1',
    type: 'mockFactory',
    getDisplayName: () => 'Factory 1',
    getDescription: () => 'Factory 1 description',
    getIconType: () => 'icon1',
  } as unknown as EmbeddableFactory;

  const factoryGroupMap = {
    group1: {
      id: 'panel1',
      appName: 'App 1',
      icon: 'icon1',
      order: 10,
      factories: [mockFactory],
    },
  } as unknown as Record<string, FactoryGroup>;

  const groupedAddPanelAction = {
    group1: {
      id: 'panel2',
      title: 'Panel 2',
      icon: 'icon2',
      order: 10,
      items: [
        {
          id: 'addPanelActionId',
          order: 0,
        },
      ],
    },
  } as unknown as Record<string, GroupedAddPanelActions>;

  it('should merge factoryGroupMap and groupedAddPanelAction correctly', () => {
    const groupedPanels = mergeGroupedItemsProvider(getEmbeddableFactoryMenuItem)(
      factoryGroupMap,
      groupedAddPanelAction
    );

    expect(groupedPanels).toEqual([
      {
        id: 'panel1',
        title: 'App 1',
        items: [
          {
            icon: 'icon1',
            name: 'Factory 1',
            id: 'mockFactory',
            description: 'Factory 1 description',
            'data-test-subj': 'createNew-mockFactory',
            onClick: expect.any(Function),
            order: 0,
          },
          {
            id: 'addPanelActionId',
            order: 0,
          },
        ],
        'data-test-subj': 'dashboardEditorMenu-group1Group',
        order: 10,
      },
    ]);
  });

  it('should handle missing factoryGroup correctly', () => {
    const groupedPanels = mergeGroupedItemsProvider(getEmbeddableFactoryMenuItem)(
      {},
      groupedAddPanelAction
    );

    expect(groupedPanels).toEqual([
      {
        id: 'panel2',
        icon: 'icon2',
        title: 'Panel 2',
        items: [
          {
            id: 'addPanelActionId',
            order: 0,
          },
        ],
        order: 10,
      },
    ]);
  });

  it('should handle missing groupedAddPanelAction correctly', () => {
    const groupedPanels = mergeGroupedItemsProvider(getEmbeddableFactoryMenuItem)(
      factoryGroupMap,
      {}
    );

    expect(groupedPanels).toEqual([
      {
        id: 'panel1',
        title: 'App 1',
        items: [
          {
            icon: 'icon1',
            id: 'mockFactory',
            name: 'Factory 1',
            description: 'Factory 1 description',
            'data-test-subj': 'createNew-mockFactory',
            onClick: expect.any(Function),
            order: 0,
          },
        ],
        order: 10,
        'data-test-subj': 'dashboardEditorMenu-group1Group',
      },
    ]);
  });
});
