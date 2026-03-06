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
import type { AppMenuExtensionParams } from '../../../../../context_awareness';
import type { DiscoverAppMenuItemType } from '@kbn/discover-utils';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DiscoverServices } from '../../../../../build_services';

const getAlertsMenuItem = async ({
  dataView = dataViewMock,
  isEsqlMode = false,
  authorizedRuleTypeIds = [ES_QUERY_ID],
  services = createDiscoverServicesMock(),
}: {
  dataView?: DataView;
  isEsqlMode?: boolean;
  authorizedRuleTypeIds?: string[];
  services?: DiscoverServices;
} = {}): Promise<DiscoverAppMenuItemType> => {
  const toolkit = getDiscoverInternalStateMock({ services });

  await toolkit.initializeTabs();

  const { stateContainer } = await toolkit.initializeSingleTab({
    tabId: toolkit.getCurrentTab().id,
  });

  const discoverParamsMock: AppMenuExtensionParams = {
    dataView,
    adHocDataViews: [],
    isEsqlMode,
    authorizedRuleTypeIds,
    actions: {
      updateAdHocDataViews: jest.fn(),
    },
  };

  return getAlertsAppMenuItem({
    discoverParams: discoverParamsMock,
    services,
    stateContainer,
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

    it('should link to the management page when rules app is not registered', async () => {
      const services = createDiscoverServicesMock();
      (services.application.isAppRegistered as jest.Mock).mockReturnValue(false);
      (services.application.getUrlForApp as jest.Mock).mockImplementation(
        (appId: string) => `/app/${appId}`
      );
      const alertsMenuItem = await getAlertsMenuItem({ services });
      const manageAlertsItem = alertsMenuItem.items?.find(
        (item) => item.testId === 'discoverManageAlertsButton'
      );
      expect(manageAlertsItem?.href).toBe(
        '/app/management/insightsAndAlerting/triggersActions/rules'
      );
    });
  });
});
