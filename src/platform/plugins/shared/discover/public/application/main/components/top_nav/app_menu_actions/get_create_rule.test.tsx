/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, act } from '@testing-library/react';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { ES_QUERY_ID } from '@kbn/rule-data-utils';
import { AppMenuActionId } from '@kbn/discover-utils';
import { getCreateRuleMenuItem, CreateESQLRuleFlyout } from './get_create_rule';
import { discoverServiceMock } from '../../../../../__mocks__/services';
import { getDiscoverStateMock } from '../../../../../__mocks__/discover_state.mock';
import type { AppMenuExtensionParams } from '../../../../../context_awareness';
import type { DiscoverAppMenuItemType } from '@kbn/discover-utils';
import { internalStateActions } from '../../../state_management/redux';

// Mock CreateAlertFlyout from get_alerts
jest.mock('./get_alerts', () => ({
  CreateAlertFlyout: () => <div data-test-subj="mockCreateAlertFlyout" />,
  getManageRulesUrl: () => '/app/management/insightsAndAlerting/triggersActions/rules',
  getTimeField: (dataView: {
    timeFieldName?: string;
    fields?: { getByType?: (type: string) => { name: string }[] };
  }) => dataView?.timeFieldName || dataView?.fields?.getByType?.('date')?.[0]?.name,
}));

const getCreateRuleMenu = (
  dataView = dataViewMock,
  isEsqlMode = true,
  authorizedRuleTypeIds = [ES_QUERY_ID]
): DiscoverAppMenuItemType => {
  const stateContainer = getDiscoverStateMock({ isTimeBased: true });
  stateContainer.internalState.dispatch(
    stateContainer.injectCurrentTab(internalStateActions.assignNextDataView)({
      dataView,
    })
  );

  const tabId = stateContainer.getCurrentTab().id;
  const getState = () => stateContainer.internalState.getState();

  const discoverParamsMock: AppMenuExtensionParams = {
    dataView,
    adHocDataViews: [],
    isEsqlMode,
    authorizedRuleTypeIds,
    actions: {
      updateAdHocDataViews: jest.fn(),
    },
  };

  return getCreateRuleMenuItem({
    discoverParams: discoverParamsMock,
    services: discoverServiceMock,
    tabId,
    getState,
  });
};

describe('getCreateRuleMenuItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Menu Structure', () => {
    it('should return a menu item with the correct id', () => {
      const menuItem = getCreateRuleMenu();
      expect(menuItem.id).toBe(AppMenuActionId.createRule);
    });

    it('should have the correct label and testId for the main menu button', () => {
      const menuItem = getCreateRuleMenu();
      expect(menuItem.label).toBe('Rules');
      expect(menuItem.testId).toBe('discoverRulesMenuButton');
    });

    it('should have the bell icon', () => {
      const menuItem = getCreateRuleMenu();
      expect(menuItem.iconType).toBe('bell');
    });

    it('should have tooltip content', () => {
      const menuItem = getCreateRuleMenu();
      expect(menuItem.tooltipContent).toBe('Create alerting rules from this query');
    });

    it('should have nested items array', () => {
      const menuItem = getCreateRuleMenu();
      expect(menuItem.items).toBeDefined();
      expect(Array.isArray(menuItem.items)).toBe(true);
    });

    describe('Nested Items', () => {
      it('should have "Create v2 ES|QL rule" item for ES|QL rules', () => {
        const menuItem = getCreateRuleMenu();
        const createRuleItem = menuItem.items?.find((item) => item.id === 'create-rule');

        expect(createRuleItem).toBeDefined();
        expect(createRuleItem?.label).toBe('Create v2 ES|QL rule');
        expect(createRuleItem?.testId).toBe('discoverCreateRuleButton');
        expect(createRuleItem?.iconType).toBe('bell');
        expect(createRuleItem?.order).toBe(1);
        expect(createRuleItem?.run).toBeDefined();
        expect(typeof createRuleItem?.run).toBe('function');
      });

      it('should have "Create v1 rules" submenu that starts empty (populated at merge time)', () => {
        const menuItem = getCreateRuleMenu();
        const legacyRulesItem = menuItem.items?.find((item) => item.id === 'legacy-rules');

        expect(legacyRulesItem).toBeDefined();
        expect(legacyRulesItem?.label).toBe('Create v1 rules');
        expect(legacyRulesItem?.testId).toBe('discoverLegacyRulesButton');
        expect(legacyRulesItem?.order).toBe(2);
        expect(legacyRulesItem?.items).toBeDefined();
        expect(legacyRulesItem?.items).toHaveLength(0);
      });

      it('should not include "Search threshold rule" when ES_QUERY_ID is not authorized', () => {
        const menuItem = getCreateRuleMenu(dataViewMock, true, []); // No authorized rule types
        const legacyRulesItem = menuItem.items?.find((item) => item.id === 'legacy-rules');
        const searchThresholdItem = legacyRulesItem?.items?.find(
          (item) => item.id === 'legacy-search-threshold'
        );

        expect(searchThresholdItem).toBeUndefined();
      });
    });
  });
});

describe('CreateESQLRuleFlyout', () => {
  beforeEach(() => {
    // Reset history to a known state before each test
    discoverServiceMock.history.push('/app/discover');
  });

  it('should NOT close flyout when query parameters change but pathname stays the same', () => {
    const stateContainer = getDiscoverStateMock({ isTimeBased: true });
    const tabId = stateContainer.getCurrentTab().id;
    const getState = () => stateContainer.internalState.getState();
    const onClose = jest.fn();

    render(
      <CreateESQLRuleFlyout
        discoverParams={{
          dataView: dataViewMock,
          adHocDataViews: [],
          isEsqlMode: true,
          authorizedRuleTypeIds: [ES_QUERY_ID],
          actions: { updateAdHocDataViews: jest.fn() },
        }}
        services={discoverServiceMock}
        tabId={tabId}
        getState={getState}
        onClose={onClose}
      />
    );

    // Simulate query parameter change (same pathname, different search params)
    act(() => {
      discoverServiceMock.history.push('/app/discover?_a=(query:(esql:newQuery))');
    });

    // Flyout should NOT close because pathname is still '/app/discover'
    expect(onClose).not.toHaveBeenCalled();
  });

  it('should close flyout when pathname changes (actual navigation)', () => {
    const stateContainer = getDiscoverStateMock({ isTimeBased: true });
    const tabId = stateContainer.getCurrentTab().id;
    const getState = () => stateContainer.internalState.getState();
    const onClose = jest.fn();

    render(
      <CreateESQLRuleFlyout
        discoverParams={{
          dataView: dataViewMock,
          adHocDataViews: [],
          isEsqlMode: true,
          authorizedRuleTypeIds: [ES_QUERY_ID],
          actions: { updateAdHocDataViews: jest.fn() },
        }}
        services={discoverServiceMock}
        tabId={tabId}
        getState={getState}
        onClose={onClose}
      />
    );

    // Simulate actual navigation to a different route
    act(() => {
      discoverServiceMock.history.push('/app/dashboards');
    });

    // Flyout SHOULD close because pathname changed
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
