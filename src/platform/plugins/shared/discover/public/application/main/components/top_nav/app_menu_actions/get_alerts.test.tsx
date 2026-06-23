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
import { getAlertsAppMenuItem } from './get_alerts';
import { createDiscoverServicesMock } from '../../../../../__mocks__/services';
import { dataViewWithTimefieldMock } from '../../../../../__mocks__/data_view_with_timefield';
import { dataViewWithNoTimefieldMock } from '../../../../../__mocks__/data_view_no_timefield';
import { getDiscoverInternalStateMock } from '../../../../../__mocks__/discover_state.mock';
import type {
  AlertsLegacyRuleType,
  AppMenuExtensionParams,
} from '../../../../../context_awareness';
import type { DiscoverAppMenuItemType } from '@kbn/discover-utils';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DiscoverServices } from '../../../../../build_services';
import { internalStateActions } from '../../../state_management/redux';
import type { ReactElement } from 'react';

const getAlertsMenuItem = async ({
  dataView = dataViewMock,
  isEsqlMode = false,
  authorizedRuleTypeIds = [ES_QUERY_ID],
  services = createDiscoverServicesMock(),
  showCreateRuleV2,
  esqlQuery = 'FROM logs-*',
  additionalLegacyRuleTypes,
}: {
  dataView?: DataView;
  isEsqlMode?: boolean;
  authorizedRuleTypeIds?: string[];
  services?: DiscoverServices;
  showCreateRuleV2?: boolean;
  esqlQuery?: string;
  additionalLegacyRuleTypes?: AlertsLegacyRuleType[];
} = {}): Promise<DiscoverAppMenuItemType> => {
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

  return getAlertsAppMenuItem({
    discoverParams: discoverParamsMock,
    services,
    tabId: currentTab.id,
    getState: toolkit.internalState.getState,
    dispatch: toolkit.internalState.dispatch,
    showCreateRuleV2,
    subscribe: (listener) => toolkit.internalState.subscribe(listener),
    additionalLegacyRuleTypes,
  });
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
    it('should return a direct action (no popover items) when showCreateRuleV2 is true', async () => {
      const alertsMenuItem = await getAlertsMenuItem({ showCreateRuleV2: true });

      expect(alertsMenuItem.items).toBeUndefined();
      expect(alertsMenuItem.run).toBeDefined();
      expect(alertsMenuItem.testId).toBe('discoverAlertsButton');
    });

    it('should have label "Create alert rule" when showCreateRuleV2 is true', async () => {
      const alertsMenuItem = await getAlertsMenuItem({ showCreateRuleV2: true });

      expect(alertsMenuItem.label).toBe('Create alert rule');
    });

    it('should return popover items when showCreateRuleV2 is false', async () => {
      const alertsMenuItem = await getAlertsMenuItem({ showCreateRuleV2: false });

      expect(alertsMenuItem.items).toBeDefined();
      expect(alertsMenuItem.items!.length).toBeGreaterThan(0);
    });

    it('should return popover items when showCreateRuleV2 is undefined', async () => {
      const alertsMenuItem = await getAlertsMenuItem();

      expect(alertsMenuItem.items).toBeDefined();
      expect(alertsMenuItem.items!.length).toBeGreaterThan(0);
    });
  });

  describe('alertsMenuItem.run', () => {
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
      const alertsMenuItem = await getAlertsMenuItem({
        services,
        showCreateRuleV2: true,
        isEsqlMode: true,
        esqlQuery: 'FROM test-index | WHERE message != ""',
      });

      const onFinishAction = jest.fn();
      const flyoutElement = alertsMenuItem.run!(createRunParams(onFinishAction)) as ReactElement;

      expect(flyoutElement.type).toBe(createRuleOptionsFlyoutMock);
      expect(flyoutElement.props.initialQuery).toBe('FROM test-index | WHERE message != ""');
      expect(flyoutElement.props.onClose).toBe(onFinishAction);
      expect(flyoutElement.props.subscribe).toEqual(expect.any(Function));
      expect(flyoutElement.props.getQuery).toEqual(expect.any(Function));
      expect(flyoutElement.props.getEsqlVariables).toEqual(expect.any(Function));
      expect(flyoutElement.props.history).toBe(services.history);
    });

    it('should include the search threshold legacy rule when v1 rule creation is authorized', async () => {
      const alertsMenuItem = await getAlertsMenuItem({
        showCreateRuleV2: true,
        isEsqlMode: true,
        authorizedRuleTypeIds: [ES_QUERY_ID],
      });

      const flyoutElement = alertsMenuItem.run!(createRunParams()) as ReactElement;

      expect(flyoutElement.props.legacyRuleTypes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'search-threshold-rule',
            label: 'Search threshold rule',
            'data-test-subj': 'discoverLegacySearchThresholdRule',
          }),
        ])
      );
    });

    it('should merge additional legacy rule types from profile extensions', async () => {
      const profileLegacyRule: AlertsLegacyRuleType = {
        id: 'custom-threshold-rule',
        label: 'Create custom threshold rule',
        render: jest.fn(() => null),
      };

      const alertsMenuItem = await getAlertsMenuItem({
        showCreateRuleV2: true,
        isEsqlMode: true,
        additionalLegacyRuleTypes: [profileLegacyRule],
      });

      const flyoutElement = alertsMenuItem.run!(createRunParams()) as ReactElement;

      expect(flyoutElement.props.legacyRuleTypes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'custom-threshold-rule',
            label: 'Create custom threshold rule',
          }),
        ])
      );
    });

    it('should expose getQuery that reads the latest tab query when invoked', async () => {
      const services = createDiscoverServicesMock();
      const toolkit = getDiscoverInternalStateMock({ services });

      await toolkit.initializeTabs();
      await toolkit.initializeSingleTab({ tabId: toolkit.getCurrentTab().id });

      const currentTab = toolkit.getCurrentTab();
      const discoverParamsMock: AppMenuExtensionParams = {
        dataView: dataViewMock,
        adHocDataViews: [],
        isEsqlMode: true,
        authorizedRuleTypeIds: [ES_QUERY_ID],
      };

      toolkit.internalState.dispatch(
        toolkit.injectCurrentTab(internalStateActions.setAppState)({
          appState: { query: { esql: 'FROM initial-index' } },
        })
      );

      const alertsMenuItem = getAlertsAppMenuItem({
        discoverParams: discoverParamsMock,
        services,
        tabId: currentTab.id,
        getState: toolkit.internalState.getState,
        dispatch: toolkit.internalState.dispatch,
        showCreateRuleV2: true,
        subscribe: (listener) => toolkit.internalState.subscribe(listener),
      });

      const flyoutElement = alertsMenuItem.run!(createRunParams()) as ReactElement;

      expect(flyoutElement.props.getQuery()).toBe('FROM initial-index');

      toolkit.internalState.dispatch(
        toolkit.injectCurrentTab(internalStateActions.setAppState)({
          appState: { query: { esql: 'FROM updated-index | WHERE status == "open"' } },
        })
      );

      expect(flyoutElement.props.getQuery()).toBe('FROM updated-index | WHERE status == "open"');
    });
  });
});
