/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { PresentationContainer } from '@kbn/presentation-containers';
import { GroupedAppPanelActions } from './add_panel_action_menu_items';
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
      panelId: 'panel1',
      appName: 'App 1',
      icon: 'icon1',
      factories: [mockFactory],
    },
  } as unknown as Record<string, FactoryGroup>;

  const groupedAddPanelAction = {
    group1: {
      id: 'panel2',
      title: 'Panel 2',
      icon: 'icon2',
      items: [
        {
          id: 'addPanelActionId',
        },
      ],
    },
  } as unknown as Record<string, GroupedAppPanelActions>;

  it('should merge factoryGroupMap and groupedAddPanelAction correctly', () => {
    const [initialPanelGroups, additionalPanels] = mergeGroupedItemsProvider(
      getEmbeddableFactoryMenuItem
    )(factoryGroupMap, groupedAddPanelAction);

    expect(initialPanelGroups).toEqual([
      {
        'data-test-subj': 'dashboardEditorMenu-group1Group',
        name: 'App 1',
        icon: 'icon1',
        panel: 'panel1',
      },
    ]);

    expect(additionalPanels).toEqual([
      {
        id: 'panel1',
        title: 'App 1',
        items: [
          {
            icon: 'icon1',
            name: 'Factory 1',
            toolTipContent: 'Factory 1 description',
            'data-test-subj': 'createNew-mockFactory',
            onClick: expect.any(Function),
          },
          {
            id: 'addPanelActionId',
          },
        ],
      },
    ]);
  });

  it('should handle missing factoryGroup correctly', () => {
    const [initialPanelGroups, additionalPanels] = mergeGroupedItemsProvider(
      getEmbeddableFactoryMenuItem
    )({}, groupedAddPanelAction);

    expect(initialPanelGroups).toEqual([
      {
        'data-test-subj': 'dashboardEditorMenu-group1Group',
        name: 'Panel 2',
        icon: 'icon2',
        panel: 'panel2',
      },
    ]);

    expect(additionalPanels).toEqual([
      {
        id: 'panel2',
        title: 'Panel 2',
        items: [
          {
            id: 'addPanelActionId',
          },
        ],
      },
    ]);
  });

  it('should handle missing groupedAddPanelAction correctly', () => {
    const [initialPanelGroups, additionalPanels] = mergeGroupedItemsProvider(
      getEmbeddableFactoryMenuItem
    )(factoryGroupMap, {});

    expect(initialPanelGroups).toEqual([
      {
        'data-test-subj': 'dashboardEditorMenu-group1Group',
        name: 'App 1',
        icon: 'icon1',
        panel: 'panel1',
      },
    ]);

    expect(additionalPanels).toEqual([
      {
        id: 'panel1',
        title: 'App 1',
        items: [
          {
            icon: 'icon1',
            name: 'Factory 1',
            toolTipContent: 'Factory 1 description',
            'data-test-subj': 'createNew-mockFactory',
            onClick: expect.any(Function),
          },
        ],
      },
    ]);
  });
});
