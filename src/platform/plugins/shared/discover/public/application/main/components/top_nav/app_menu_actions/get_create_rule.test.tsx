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
import { dataViewWithTimefieldMock } from '../../../../../__mocks__/data_view_with_timefield';
import { dataViewWithNoTimefieldMock } from '../../../../../__mocks__/data_view_no_timefield';
import { getDiscoverStateMock } from '../../../../../__mocks__/discover_state.mock';
import type { AppMenuExtensionParams } from '../../../../../context_awareness';
import type { DiscoverAppMenuItemType, DiscoverAppMenuPopoverItem } from '@kbn/discover-utils';
import { internalStateActions } from '../../../state_management/redux';

// Mock the DynamicRuleFormFlyout since we're testing the wrapper behavior
jest.mock('@kbn/alerting-v2-rule-form', () => ({
  DynamicRuleFormFlyout: ({ query, onClose }: { query: string; onClose: () => void }) => (
    <div data-test-subj="mockDynamicRuleFormFlyout">
      <span data-test-subj="flyoutQuery">{query}</span>
      <button data-test-subj="closeFlyout" onClick={onClose}>
        Close
      </button>
    </div>
  ),
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
    stateContainer,
  });
};

const getLegacyRulesSubmenu = (
  menuItem: DiscoverAppMenuItemType
): DiscoverAppMenuPopoverItem | undefined => {
  return menuItem.items?.find((item) => item.testId === 'discoverLegacyRulesButton');
};

const getLegacyRulesItems = (
  menuItem: DiscoverAppMenuItemType
): DiscoverAppMenuPopoverItem[] | undefined => {
  const legacyRulesSubmenu = getLegacyRulesSubmenu(menuItem);
  return legacyRulesSubmenu?.items;
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

    it('should have the correct label and testId', () => {
      const menuItem = getCreateRuleMenu();
      expect(menuItem.label).toBe('Rules');
      expect(menuItem.testId).toBe('discoverRulesMenuButton');
    });

    it('should include the Create rule button', () => {
      const menuItem = getCreateRuleMenu();
      const createRuleItem = menuItem.items?.find(
        (item) => item.testId === 'discoverCreateRuleButton'
      );
      expect(createRuleItem).toBeDefined();
      expect(createRuleItem?.label).toBe('Create rule');
    });

    it('should include the Create legacy rules submenu when capabilities allow', () => {
      const menuItem = getCreateRuleMenu();
      const legacyRulesSubmenu = getLegacyRulesSubmenu(menuItem);
      expect(legacyRulesSubmenu).toBeDefined();
      expect(legacyRulesSubmenu?.label).toBe('Create legacy rules');
    });
  });

  describe('Legacy Rules Submenu', () => {
    it('should include the Search threshold rule when ES_QUERY_ID is authorized', () => {
      const menuItem = getCreateRuleMenu();
      const legacyItems = getLegacyRulesItems(menuItem);
      const searchThresholdItem = legacyItems?.find(
        (item) => item.testId === 'discoverLegacySearchThresholdButton'
      );
      expect(searchThresholdItem).toBeDefined();
      expect(searchThresholdItem?.label).toBe('Search threshold rule');
    });

    it('should not include the Search threshold rule when ES_QUERY_ID is not authorized', () => {
      const menuItem = getCreateRuleMenu(dataViewMock, true, []);
      const legacyItems = getLegacyRulesItems(menuItem);
      const searchThresholdItem = legacyItems?.find(
        (item) => item.testId === 'discoverLegacySearchThresholdButton'
      );
      expect(searchThresholdItem).toBeUndefined();
    });

    it('should include the Manage rules and connectors link', () => {
      const menuItem = getCreateRuleMenu();
      const legacyItems = getLegacyRulesItems(menuItem);
      const manageRulesItem = legacyItems?.find(
        (item) => item.testId === 'discoverManageRulesButton'
      );
      expect(manageRulesItem).toBeDefined();
      expect(manageRulesItem?.label).toBe('Manage rules and connectors');
    });

    it('should have the Manage rules and connectors link at the end (highest order)', () => {
      const menuItem = getCreateRuleMenu();
      const legacyItems = getLegacyRulesItems(menuItem);
      const manageRulesItem = legacyItems?.find(
        (item) => item.testId === 'discoverManageRulesButton'
      );
      expect(manageRulesItem?.order).toBe(Number.MAX_SAFE_INTEGER);
    });
  });

  describe('Time Field Behavior - ES|QL Mode', () => {
    it('should have the Search threshold rule button enabled if the data view has a time field', () => {
      const menuItem = getCreateRuleMenu(dataViewWithTimefieldMock, true);
      const legacyItems = getLegacyRulesItems(menuItem);
      const searchThresholdItem = legacyItems?.find(
        (item) => item.testId === 'discoverLegacySearchThresholdButton'
      );
      expect(searchThresholdItem?.disableButton).toBe(false);
    });

    it('should have the Search threshold rule button enabled if the data view has no timeFieldName but at least one date field', () => {
      const menuItem = getCreateRuleMenu(dataViewMock, true);
      const legacyItems = getLegacyRulesItems(menuItem);
      const searchThresholdItem = legacyItems?.find(
        (item) => item.testId === 'discoverLegacySearchThresholdButton'
      );
      expect(searchThresholdItem?.disableButton).toBe(false);
    });

    it('should have the Search threshold rule button disabled if the data view has no time fields at all', () => {
      const menuItem = getCreateRuleMenu(dataViewWithNoTimefieldMock, true);
      const legacyItems = getLegacyRulesItems(menuItem);
      const searchThresholdItem = legacyItems?.find(
        (item) => item.testId === 'discoverLegacySearchThresholdButton'
      );
      expect(searchThresholdItem?.disableButton).toBe(true);
    });
  });

  describe('Time Field Behavior - Data View Mode', () => {
    it('should have the Search threshold rule button enabled if the data view has timeFieldName set', () => {
      const menuItem = getCreateRuleMenu(dataViewWithTimefieldMock, false);
      const legacyItems = getLegacyRulesItems(menuItem);
      const searchThresholdItem = legacyItems?.find(
        (item) => item.testId === 'discoverLegacySearchThresholdButton'
      );
      expect(searchThresholdItem?.disableButton).toBe(false);
    });

    it('should have the Search threshold rule button disabled if the data view has no timeFieldName (even with date fields)', () => {
      // In non-ES|QL mode, only timeFieldName is checked, not date fields
      const menuItem = getCreateRuleMenu(dataViewMock, false);
      const legacyItems = getLegacyRulesItems(menuItem);
      const searchThresholdItem = legacyItems?.find(
        (item) => item.testId === 'discoverLegacySearchThresholdButton'
      );
      expect(searchThresholdItem?.disableButton).toBe(true);
    });
  });

  describe('Manage rules and connectors link', () => {
    it('should link to the unified rules page when rules app is registered', () => {
      (discoverServiceMock.application.isAppRegistered as jest.Mock).mockReturnValue(true);
      (discoverServiceMock.application.getUrlForApp as jest.Mock).mockImplementation(
        (appId: string) => `/app/${appId}`
      );
      const menuItem = getCreateRuleMenu();
      const legacyItems = getLegacyRulesItems(menuItem);
      const manageRulesItem = legacyItems?.find(
        (item) => item.testId === 'discoverManageRulesButton'
      );
      expect(manageRulesItem?.href).toBe('/app/rules');
    });

    it('should link to the management page when rules app is not registered', () => {
      (discoverServiceMock.application.isAppRegistered as jest.Mock).mockReturnValue(false);
      (discoverServiceMock.application.getUrlForApp as jest.Mock).mockImplementation(
        (appId: string) => `/app/${appId}`
      );
      const menuItem = getCreateRuleMenu();
      const legacyItems = getLegacyRulesItems(menuItem);
      const manageRulesItem = legacyItems?.find(
        (item) => item.testId === 'discoverManageRulesButton'
      );
      expect(manageRulesItem?.href).toBe(
        '/app/management/insightsAndAlerting/triggersActions/rules'
      );
    });
  });

  describe('Capabilities', () => {
    it('should not include legacy rules submenu if triggersActions capability is not available', () => {
      const originalCapabilities = discoverServiceMock.capabilities;
      discoverServiceMock.capabilities = {
        ...originalCapabilities,
        management: {
          insightsAndAlerting: {
            triggersActions: false,
          },
        },
      };

      const menuItem = getCreateRuleMenu();
      const legacyRulesSubmenu = getLegacyRulesSubmenu(menuItem);

      // Legacy rules submenu should not be present since legacyItems will be empty
      expect(legacyRulesSubmenu).toBeUndefined();

      // Restore original capabilities
      discoverServiceMock.capabilities = originalCapabilities;
    });
  });

  describe('Run Actions', () => {
    it('should have a run function for the Create rule button', () => {
      const menuItem = getCreateRuleMenu();
      const createRuleItem = menuItem.items?.find(
        (item) => item.testId === 'discoverCreateRuleButton'
      );
      expect(createRuleItem?.run).toBeDefined();
      expect(typeof createRuleItem?.run).toBe('function');
    });

    it('should have a run function for the Search threshold rule button', () => {
      const menuItem = getCreateRuleMenu();
      const legacyItems = getLegacyRulesItems(menuItem);
      const searchThresholdItem = legacyItems?.find(
        (item) => item.testId === 'discoverLegacySearchThresholdButton'
      );
      expect(searchThresholdItem?.run).toBeDefined();
      expect(typeof searchThresholdItem?.run).toBe('function');
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
        stateContainer={stateContainer}
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
        stateContainer={stateContainer}
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
