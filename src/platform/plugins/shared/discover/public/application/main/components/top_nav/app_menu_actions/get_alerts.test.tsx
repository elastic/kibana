/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { ES_QUERY_ID } from '@kbn/rule-data-utils';
import { AppMenuActionId, type DiscoverAppMenuPopoverItem } from '@kbn/discover-utils';
import { ESQLVariableType } from '@kbn/esql-types';
import { getAlertsAppMenuItem, getCreateRuleOptionsAppMenuItem } from './get_alerts';
import { createDiscoverServicesMock } from '../../../../../__mocks__/services';
import { dataViewWithTimefieldMock } from '../../../../../__mocks__/data_view_with_timefield';
import { dataViewWithNoTimefieldMock } from '../../../../../__mocks__/data_view_no_timefield';
import { getDiscoverInternalStateMock } from '../../../../../__mocks__/discover_state.mock';
import type { AppMenuExtensionParams } from '../../../../../context_awareness';
import type { DiscoverAppMenuItemType } from '@kbn/discover-utils';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DiscoverServices } from '../../../../../build_services';
import { internalStateActions } from '../../../state_management/redux';
import type { ReactElement } from 'react';

const setupAlertsMenuItem = async ({
  dataView = dataViewMock,
  isEsqlMode = false,
  authorizedRuleTypeIds = [ES_QUERY_ID],
  services = createDiscoverServicesMock(),
  esqlQuery = 'FROM logs-*',
}: {
  dataView?: DataView;
  isEsqlMode?: boolean;
  authorizedRuleTypeIds?: string[];
  services?: DiscoverServices;
  esqlQuery?: string;
} = {}) => {
  const toolkit = getDiscoverInternalStateMock({ services });

  await toolkit.initializeTabs();

  if (isEsqlMode) {
    toolkit.internalState.dispatch(
      toolkit.injectCurrentTab(internalStateActions.setAppState)({
        appState: { query: { esql: esqlQuery } },
      })
    );
  }

  await toolkit.initializeSingleTab({
    tabId: toolkit.getCurrentTab().id,
  });

  const currentTab = toolkit.getCurrentTab();

  const discoverParamsMock: AppMenuExtensionParams = {
    dataView,
    adHocDataViews: [],
    isEsqlMode,
    authorizedRuleTypeIds,
  };

  const alertsMenuItem = getAlertsAppMenuItem({
    discoverParams: discoverParamsMock,
    services,
    tabId: currentTab.id,
    getState: toolkit.internalState.getState,
    dispatch: toolkit.internalState.dispatch,
  });

  return { alertsMenuItem, currentTab, discoverParamsMock, services, toolkit };
};

const getAlertsMenuItem = async (
  params: Parameters<typeof setupAlertsMenuItem>[0] = {}
): Promise<DiscoverAppMenuItemType> => {
  return (await setupAlertsMenuItem(params)).alertsMenuItem;
};

const setupCreateRuleOptionsMenuItem = async (
  params: Parameters<typeof setupAlertsMenuItem>[0] & {
    alertsPopoverItems?: DiscoverAppMenuPopoverItem[];
  } = {}
) => {
  const setup = await setupAlertsMenuItem({ ...params, isEsqlMode: params.isEsqlMode ?? true });
  const createRuleOptionsAppMenuItem = getCreateRuleOptionsAppMenuItem({
    baseItem: setup.alertsMenuItem,
    alertsPopoverItems: params.alertsPopoverItems ?? setup.alertsMenuItem.items ?? [],
    services: setup.services,
    tabId: setup.currentTab.id,
    getState: setup.toolkit.internalState.getState,
    subscribe: (listener) => setup.toolkit.internalState.subscribe(listener),
  });

  if (!createRuleOptionsAppMenuItem) {
    throw new Error('Expected create rule options app menu item to be defined');
  }

  return { ...setup, createRuleOptionsAppMenuItem };
};

describe('getAlertsAppMenuItem', () => {
  describe('Authorized Rule Types', () => {
    it('should include the manage alerts button if there is any authorized rule type', async () => {
      const alertsMenuItem = await getAlertsMenuItem({
        dataView: dataViewMock,
        isEsqlMode: false,
        authorizedRuleTypeIds: ['anyAuthorizedRule'],
      });
      const manageAlertsItem = alertsMenuItem.items?.find(
        (item) => item.testId === 'discoverManageAlertsButton'
      );
      expect(manageAlertsItem).toBeDefined();
    });

    it('should include the create search threshold rule button if it is authorized', async () => {
      const alertsMenuItem = await getAlertsMenuItem();
      const createAlertItem = alertsMenuItem.items?.find(
        (item) => item.testId === 'discoverCreateAlertButton'
      );
      expect(createAlertItem).toBeDefined();
    });

    it('should not include the create search threshold rule button if it is not authorized', async () => {
      const alertsMenuItem = await getAlertsMenuItem({
        dataView: dataViewMock,
        isEsqlMode: false,
        authorizedRuleTypeIds: [],
      });
      const createAlertItem = alertsMenuItem.items?.find(
        (item) => item.testId === 'discoverCreateAlertButton'
      );
      expect(createAlertItem).toBeUndefined();
    });
  });
  describe('Dataview mode', () => {
    it('should have the create search threshold rule button disabled if the data view has no time field', async () => {
      const alertsMenuItem = await getAlertsMenuItem();
      const createAlertItem = alertsMenuItem.items?.find(
        (item) => item.testId === 'discoverCreateAlertButton'
      );
      expect(createAlertItem?.disableButton).toBe(true);
    });

    it('should have the create search threshold rule button enabled if the data view has a time field', async () => {
      const alertsMenuItem = await getAlertsMenuItem({ dataView: dataViewWithTimefieldMock });
      const createAlertItem = alertsMenuItem.items?.find(
        (item) => item.testId === 'discoverCreateAlertButton'
      );
      expect(createAlertItem?.disableButton).toBe(false);
    });

    it('should include the manage rules and connectors link', async () => {
      const alertsMenuItem = await getAlertsMenuItem();
      const manageAlertsItem = alertsMenuItem.items?.find(
        (item) => item.testId === 'discoverManageAlertsButton'
      );
      expect(manageAlertsItem).toBeDefined();
    });
  });

  describe('ES|QL mode', () => {
    it('should have the create search threshold rule button enabled if the data view has no timeFieldName but at least one time field', async () => {
      const alertsMenuItem = await getAlertsMenuItem({ dataView: dataViewMock, isEsqlMode: true });
      const createAlertItem = alertsMenuItem.items?.find(
        (item) => item.testId === 'discoverCreateAlertButton'
      );
      expect(createAlertItem?.disableButton).toBe(false);
    });

    it('should have the create search threshold rule button enabled if the data view has a time field', async () => {
      const alertsMenuItem = await getAlertsMenuItem({
        dataView: dataViewWithTimefieldMock,
        isEsqlMode: true,
      });
      const createAlertItem = alertsMenuItem.items?.find(
        (item) => item.testId === 'discoverCreateAlertButton'
      );
      expect(createAlertItem?.disableButton).toBe(false);
    });

    it('should have the create search threshold rule button disabled if the data view has no time fields at all', async () => {
      const alertsMenuItem = await getAlertsMenuItem({
        dataView: dataViewWithNoTimefieldMock,
        isEsqlMode: true,
      });
      const createAlertItem = alertsMenuItem.items?.find(
        (item) => item.testId === 'discoverCreateAlertButton'
      );
      expect(createAlertItem?.disableButton).toBe(true);
    });

    it('should include the manage rules and connectors link', async () => {
      const alertsMenuItem = await getAlertsMenuItem();
      const manageAlertsItem = alertsMenuItem.items?.find(
        (item) => item.testId === 'discoverManageAlertsButton'
      );
      expect(manageAlertsItem).toBeDefined();
    });
  });

  describe('Manage rules and connectors link', () => {
    it('should link to the unified rules page when rules app is registered', async () => {
      const services = createDiscoverServicesMock();
      (services.application.isAppRegistered as jest.Mock).mockReturnValue(true);
      (services.application.getUrlForApp as jest.Mock).mockImplementation(
        (appId: string) => `/app/${appId}`
      );
      const alertsMenuItem = await getAlertsMenuItem({ services });
      const manageAlertsItem = alertsMenuItem.items?.find(
        (item) => item.testId === 'discoverManageAlertsButton'
      );
      expect(manageAlertsItem?.href).toBe('/app/rules');
    });
  });

  describe('v2 selector flyout', () => {
    it('should return a direct render action that preserves base item metadata', async () => {
      const { alertsMenuItem, currentTab, services, toolkit } = await setupAlertsMenuItem();
      const createRuleOptionsAppMenuItem = getCreateRuleOptionsAppMenuItem({
        baseItem: { ...alertsMenuItem, separator: 'above' },
        alertsPopoverItems: alertsMenuItem.items ?? [],
        services,
        tabId: currentTab.id,
        getState: toolkit.internalState.getState,
        subscribe: (listener) => toolkit.internalState.subscribe(listener),
      });

      expect(createRuleOptionsAppMenuItem).toEqual(
        expect.objectContaining({
          id: AppMenuActionId.alerts,
          label: 'Create alert rule',
          testId: 'discoverAlertsButton',
          separator: 'above',
          render: expect.any(Function),
        })
      );
      expect(createRuleOptionsAppMenuItem?.items).toBeUndefined();
    });

    it('should return undefined when the v2 flyout is unavailable', async () => {
      const { alertsMenuItem, currentTab, services, toolkit } = await setupAlertsMenuItem({
        services: { ...createDiscoverServicesMock(), alertingVTwo: undefined },
      });

      const createRuleOptionsAppMenuItem = getCreateRuleOptionsAppMenuItem({
        baseItem: alertsMenuItem,
        alertsPopoverItems: alertsMenuItem.items ?? [],
        services,
        tabId: currentTab.id,
        getState: toolkit.internalState.getState,
        subscribe: (listener) => toolkit.internalState.subscribe(listener),
      });

      expect(createRuleOptionsAppMenuItem).toBeUndefined();
    });
  });

  describe('createRuleOptionsAppMenuItem.render', () => {
    const createRunParams = (onFinishAction = jest.fn()) => ({
      triggerElement: document.createElement('button'),
      returnFocus: jest.fn(),
      context: { onFinishAction },
    });

    it('should render CreateRuleOptionsFlyout with the current ES|QL query and subscribe handler', async () => {
      const createRuleOptionsFlyoutMock = jest.fn(() => null);
      const services = {
        ...createDiscoverServicesMock(),
        alertingVTwo: { CreateRuleOptionsFlyout: createRuleOptionsFlyoutMock },
      } as DiscoverServices;
      const { createRuleOptionsAppMenuItem } = await setupCreateRuleOptionsMenuItem({
        services,
        isEsqlMode: true,
        esqlQuery: 'FROM test-index | WHERE message != ""',
      });

      const onFinishAction = jest.fn();
      const flyoutElement = createRuleOptionsAppMenuItem.render!(
        createRunParams(onFinishAction)
      ) as ReactElement;

      expect(flyoutElement.type).toBe(createRuleOptionsFlyoutMock);
      expect(flyoutElement.props.initialQuery).toBe('FROM test-index | WHERE message != ""');
      expect(flyoutElement.props.onClose).toBe(onFinishAction);
      expect(flyoutElement.props.subscribe).toEqual(expect.any(Function));
      expect(flyoutElement.props.getQuery).toEqual(expect.any(Function));
      expect(flyoutElement.props.getEsqlVariables).toEqual(expect.any(Function));
      expect(flyoutElement.props.history).toBe(services.history);
    });

    it('should map renderable popover items into legacy rule types', async () => {
      const customRuleRender = jest.fn(() => null);
      const customRuleItem: DiscoverAppMenuPopoverItem = {
        id: 'custom-threshold-rule',
        order: 2,
        label: 'Create custom threshold rule',
        render: customRuleRender,
        testId: 'discoverAppMenuCustomThresholdRule',
      };

      const alertsMenuItem = await getAlertsMenuItem({ isEsqlMode: true });

      const { createRuleOptionsAppMenuItem } = await setupCreateRuleOptionsMenuItem({
        isEsqlMode: true,
        authorizedRuleTypeIds: [ES_QUERY_ID],
        alertsPopoverItems: [...(alertsMenuItem.items ?? []), customRuleItem],
      });

      const runParams = createRunParams();
      const flyoutElement = createRuleOptionsAppMenuItem.render!(runParams) as ReactElement;
      const legacyRuleType = flyoutElement.props.legacyRuleTypes.find(
        ({ id }: { id: string }) => id === 'custom-threshold-rule'
      );

      expect(flyoutElement.props.legacyRuleTypes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: AppMenuActionId.createRule,
            label: 'Create search threshold rule',
            'data-test-subj': 'discoverCreateAlertButton',
          }),
          expect.objectContaining({
            id: 'custom-threshold-rule',
            label: 'Create custom threshold rule',
          }),
        ])
      );

      const onClose = jest.fn();
      expect(legacyRuleType.render(onClose)).toBeNull();
      expect(customRuleRender).toHaveBeenCalledWith({
        ...runParams,
        context: {
          ...runParams.context,
          onFinishAction: onClose,
        },
      });
    });

    it('should only map enabled renderable popover items', async () => {
      const actionOnlyRuleItem: DiscoverAppMenuPopoverItem = {
        id: 'action-only-rule',
        order: 1,
        label: 'Action-only rule',
        run: jest.fn(),
      };
      const disabledRuleItem: DiscoverAppMenuPopoverItem = {
        id: 'disabled-rule',
        order: 2,
        label: 'Disabled rule',
        render: jest.fn(() => null),
        disableButton: true,
      };
      const enabledRuleItem: DiscoverAppMenuPopoverItem = {
        id: 'enabled-rule',
        order: 3,
        label: 'Enabled rule',
        render: jest.fn(() => null),
      };

      const { createRuleOptionsAppMenuItem } = await setupCreateRuleOptionsMenuItem({
        isEsqlMode: true,
        alertsPopoverItems: [actionOnlyRuleItem, disabledRuleItem, enabledRuleItem],
      });

      const flyoutElement = createRuleOptionsAppMenuItem.render!(createRunParams()) as ReactElement;

      expect(flyoutElement.props.legacyRuleTypes.map(({ id }: { id: string }) => id)).toEqual([
        'enabled-rule',
      ]);
    });

    it('should expose getters that read the latest tab state when invoked', async () => {
      const services = createDiscoverServicesMock();
      const { createRuleOptionsAppMenuItem, toolkit } = await setupCreateRuleOptionsMenuItem({
        services,
        isEsqlMode: true,
      });

      toolkit.internalState.dispatch(
        toolkit.injectCurrentTab(internalStateActions.setAppState)({
          appState: { query: { esql: 'FROM initial-index' } },
        })
      );
      toolkit.internalState.dispatch(
        toolkit.injectCurrentTab(internalStateActions.setEsqlVariables)({
          esqlVariables: [{ key: 'host', value: 'web-1', type: ESQLVariableType.VALUES }],
        })
      );

      const flyoutElement = createRuleOptionsAppMenuItem.render!(createRunParams()) as ReactElement;

      expect(flyoutElement.props.getQuery()).toBe('FROM initial-index');
      expect(flyoutElement.props.getEsqlVariables()).toEqual([
        { key: 'host', value: 'web-1', type: ESQLVariableType.VALUES },
      ]);

      toolkit.internalState.dispatch(
        toolkit.injectCurrentTab(internalStateActions.setAppState)({
          appState: { query: { esql: 'FROM updated-index | WHERE status == "open"' } },
        })
      );
      toolkit.internalState.dispatch(
        toolkit.injectCurrentTab(internalStateActions.setEsqlVariables)({
          esqlVariables: [{ key: 'host', value: 'web-2', type: ESQLVariableType.VALUES }],
        })
      );

      expect(flyoutElement.props.getQuery()).toBe('FROM updated-index | WHERE status == "open"');
      expect(flyoutElement.props.getEsqlVariables()).toEqual([
        { key: 'host', value: 'web-2', type: ESQLVariableType.VALUES },
      ]);
    });
  });
});
