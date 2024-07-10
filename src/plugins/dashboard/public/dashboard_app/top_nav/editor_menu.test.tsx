/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { PresentationContainer } from '@kbn/presentation-containers';
import { finalize, Observable } from 'rxjs';
import { GroupedAddPanelActions } from './add_panel_action_menu_items';
import {
  FactoryGroup,
  mergeGroupedItemsProvider,
  getEmbeddableFactoryMenuItemProvider,
  useGetDashboardPanels,
} from './editor_menu';
import { buildMockDashboard } from '../../mocks';
import { pluginServices } from '../../services/plugin_services';

jest.mock('../../services/plugin_services', () => {
  const module = jest.requireActual('../../services/plugin_services');

  const _pluginServices = (module.pluginServices as typeof pluginServices).getServices();

  jest
    .spyOn(_pluginServices.embeddable, 'getEmbeddableFactories')
    .mockReturnValue(new Map().values());
  jest.spyOn(_pluginServices.uiActions, 'getTriggerCompatibleActions').mockResolvedValue([]);
  jest.spyOn(_pluginServices.visualizations, 'getByGroup').mockReturnValue([]);
  jest.spyOn(_pluginServices.visualizations, 'getAliases').mockReturnValue([]);

  return {
    ...module,
    pluginServices: {
      ...module.pluginServices,
      getServices: jest.fn().mockReturnValue(_pluginServices),
    },
  };
});

const mockApi = { addNewPanel: jest.fn() } as unknown as jest.Mocked<PresentationContainer>;

describe('editor menu', () => {
  describe('mergeGroupedItemsProvider', () => {
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

  describe('useGetDashboardPanels', () => {
    const defaultProps: Parameters<typeof useGetDashboardPanels>[0] = {
      embeddableAPI: mockApi,
      dashboardAPI: buildMockDashboard(),
      createNewVisType: jest.fn(),
    };

    it('return value of hook has a specific shape', () => {
      const { result } = renderHook(() => useGetDashboardPanels(defaultProps));
      expect(result.current).toHaveProperty('[0]', expect.any(Observable));
      expect(result.current).toHaveProperty('[1]', expect.any(Function));
    });

    it('returned observable only a emits value when the accompanying fetch method is invoked', (done) => {
      const { result } = renderHook(() => useGetDashboardPanels(defaultProps));

      const [dashboardPanels$, getDashboardPanels] = result.current;

      const mockCloseHandler = jest.fn();

      const mockOnValueSubscriber = jest.fn();

      dashboardPanels$
        .pipe(
          finalize(() => {
            expect(mockOnValueSubscriber).toHaveBeenCalled();
            done();
          })
        )
        .subscribe(mockOnValueSubscriber);

      expect(mockOnValueSubscriber).not.toHaveBeenCalled();

      act(() => {
        getDashboardPanels(mockCloseHandler);
      });
    });
  });
});
