/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { COMMON_EMBEDDABLE_GROUPING } from '@kbn/embeddable-plugin/public';
import type { PresentationContainer } from '@kbn/presentation-containers';
import type { Action, UiActionsService } from '@kbn/ui-actions-plugin/public';
import { ADD_PANEL_TRIGGER } from '@kbn/ui-actions-plugin/public';
import {
  VisGroups,
  VisTypeAlias,
  VisualizationsStart,
  type BaseVisType,
} from '@kbn/visualizations-plugin/public';
import { renderHook } from '@testing-library/react-hooks';

import { visualizationsService } from '../../../services/kibana_services';
import { pluginServices } from '../../../services/plugin_services';
import { useGetDashboardPanels } from './use_get_dashboard_panels';

const mockApi = { addNewPanel: jest.fn() } as unknown as jest.Mocked<PresentationContainer>;

describe('Get dashboard panels hook', () => {
  const defaultHookProps: Parameters<typeof useGetDashboardPanels>[0] = {
    api: mockApi,
    createNewVisType: jest.fn(),
  };

  let compatibleTriggerActionsRequestSpy: jest.SpyInstance<
    ReturnType<NonNullable<UiActionsService['getTriggerCompatibleActions']>>
  >;

  let dashboardVisualizationGroupGetterSpy: jest.SpyInstance<
    ReturnType<VisualizationsStart['getByGroup']>
  >;

  let dashboardVisualizationAliasesGetterSpy: jest.SpyInstance<
    ReturnType<VisualizationsStart['getAliases']>
  >;

  beforeAll(() => {
    const _pluginServices = pluginServices.getServices();

    compatibleTriggerActionsRequestSpy = jest.spyOn(
      _pluginServices.uiActions,
      'getTriggerCompatibleActions'
    );

    dashboardVisualizationGroupGetterSpy = jest.spyOn(visualizationsService, 'getByGroup');

    dashboardVisualizationAliasesGetterSpy = jest.spyOn(visualizationsService, 'getAliases');
  });

  beforeEach(() => {
    compatibleTriggerActionsRequestSpy.mockResolvedValue([]);
    dashboardVisualizationGroupGetterSpy.mockReturnValue([]);
    dashboardVisualizationAliasesGetterSpy.mockReturnValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  describe('useGetDashboardPanels', () => {
    it('hook return value is callable', () => {
      const { result } = renderHook(() => useGetDashboardPanels(defaultHookProps));
      expect(result.current).toBeInstanceOf(Function);
    });

    it('returns a callable method that yields a cached result if invoked after a prior resolution', async () => {
      const { result } = renderHook(() => useGetDashboardPanels(defaultHookProps));
      expect(result.current).toBeInstanceOf(Function);

      const firstInvocationResult = await result.current(jest.fn());

      expect(compatibleTriggerActionsRequestSpy).toHaveBeenCalledWith(ADD_PANEL_TRIGGER, {
        embeddable: expect.objectContaining(mockApi),
      });

      const secondInvocationResult = await result.current(jest.fn());

      expect(firstInvocationResult).toStrictEqual(secondInvocationResult);

      expect(compatibleTriggerActionsRequestSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('augmenting ui action group items with dashboard visualization types', () => {
    it.each([
      ['visualizations', VisGroups.PROMOTED],
      [COMMON_EMBEDDABLE_GROUPING.legacy.id, VisGroups.LEGACY],
      [COMMON_EMBEDDABLE_GROUPING.annotation.id, VisGroups.TOOLS],
    ])(
      'includes in the ui action %s group, %s dashboard visualization group types',
      async (uiActionGroupId, dashboardVisualizationGroupId) => {
        const mockVisualizationsUiAction: Action<object> = {
          id: `some-${uiActionGroupId}-action`,
          type: '',
          order: 10,
          grouping: [
            {
              id: uiActionGroupId,
              order: 1000,
              getDisplayName: jest.fn(),
              getIconType: jest.fn(),
            },
          ],
          getDisplayName: jest.fn(() => `Some ${uiActionGroupId} visualization Action`),
          getIconType: jest.fn(),
          execute: jest.fn(),
          isCompatible: jest.fn(() => Promise.resolve(true)),
        };

        const mockDashboardVisualizationType = {
          name: dashboardVisualizationGroupId,
          title: dashboardVisualizationGroupId,
          order: 0,
          description: `This is a dummy representation of a ${dashboardVisualizationGroupId} visualization.`,
          icon: 'empty',
          stage: 'production',
          isDeprecated: false,
          group: dashboardVisualizationGroupId,
          titleInWizard: `Custom ${dashboardVisualizationGroupId} visualization`,
        } as BaseVisType;

        compatibleTriggerActionsRequestSpy.mockResolvedValue([mockVisualizationsUiAction]);

        dashboardVisualizationGroupGetterSpy.mockImplementation((group) => {
          if (group !== dashboardVisualizationGroupId) return [];

          return [mockDashboardVisualizationType];
        });

        const { result } = renderHook(() => useGetDashboardPanels(defaultHookProps));
        expect(result.current).toBeInstanceOf(Function);

        expect(await result.current(jest.fn())).toStrictEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: uiActionGroupId,
              'data-test-subj': `dashboardEditorMenu-${uiActionGroupId}Group`,
              items: expect.arrayContaining([
                expect.objectContaining({
                  // @ts-expect-error ignore passing the required context in this test
                  'data-test-subj': `create-action-${mockVisualizationsUiAction.getDisplayName()}`,
                }),
                expect.objectContaining({
                  'data-test-subj': `visType-${mockDashboardVisualizationType.name}`,
                }),
              ]),
            }),
          ])
        );
      }
    );

    it('includes in the ui action visualization group dashboard visualization alias types', async () => {
      const mockVisualizationsUiAction: Action<object> = {
        id: 'some-vis-action',
        type: '',
        order: 10,
        grouping: [
          {
            id: 'visualizations',
            order: 1000,
            getDisplayName: jest.fn(),
            getIconType: jest.fn(),
          },
        ],
        getDisplayName: jest.fn(() => 'Some visualization Action'),
        getIconType: jest.fn(),
        execute: jest.fn(),
        isCompatible: jest.fn(() => Promise.resolve(true)),
      };

      const mockedAliasVisualizationType: VisTypeAlias = {
        name: 'alias visualization',
        title: 'Alias Visualization',
        order: 0,
        description: 'This is a dummy representation of aan aliased visualization.',
        icon: 'empty',
        stage: 'production',
        isDeprecated: false,
      };

      compatibleTriggerActionsRequestSpy.mockResolvedValue([mockVisualizationsUiAction]);

      dashboardVisualizationAliasesGetterSpy.mockReturnValue([mockedAliasVisualizationType]);

      const { result } = renderHook(() => useGetDashboardPanels(defaultHookProps));
      expect(result.current).toBeInstanceOf(Function);

      expect(await result.current(jest.fn())).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: mockVisualizationsUiAction.grouping![0].id,
            'data-test-subj': `dashboardEditorMenu-${
              mockVisualizationsUiAction.grouping![0].id
            }Group`,
            items: expect.arrayContaining([
              expect.objectContaining({
                // @ts-expect-error ignore passing the required context in this test
                'data-test-subj': `create-action-${mockVisualizationsUiAction.getDisplayName()}`,
              }),
              expect.objectContaining({
                'data-test-subj': `visType-${mockedAliasVisualizationType.name}`,
              }),
            ]),
          }),
        ])
      );
    });
  });
});
