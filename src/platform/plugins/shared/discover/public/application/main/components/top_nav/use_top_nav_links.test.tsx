/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { AppMenuActionId } from '@kbn/discover-utils';
import { BehaviorSubject } from 'rxjs';
import { useTopNavLinks } from './use_top_nav_links';
import type { DiscoverServices } from '../../../../build_services';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import { DiscoverTestProvider } from '../../../../__mocks__/test_provider';
import { internalStateActions } from '../../state_management/redux';

const createTestServices = (overrides: Partial<DiscoverServices> = {}) => {
  const baseMock = createDiscoverServicesMock();
  return {
    ...baseMock,
    application: {
      ...baseMock.application,
      currentAppId$: new BehaviorSubject('discover'),
    },
    capabilities: {
      discover_v2: {
        save: true,
        storeSearchSession: true,
      },
      management: {
        insightsAndAlerting: {
          triggersActions: true,
        },
      },
      ...overrides.capabilities,
    },
    uiSettings: {
      get: jest.fn(() => true),
    },
    ...overrides,
  } as unknown as DiscoverServices;
};

describe('useTopNavLinks', () => {
  const services = createTestServices();

  const state = getDiscoverStateMock({ isTimeBased: true });
  state.internalState.dispatch(
    state.injectCurrentTab(internalStateActions.assignNextDataView)({
      dataView: dataViewMock,
    })
  );

  // identifier to denote if share integration is available,
  // we default to false especially that there a specific test scenario for when this is true
  const hasShareIntegration = false;

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
      <DiscoverTestProvider
        services={services}
        stateContainer={state}
        runtimeState={{
          currentDataView: dataViewMock,
          adHocDataViews: [],
        }}
      >
        {children}
      </DiscoverTestProvider>
    );
  };

  const setup = (hookAttrs: Partial<Parameters<typeof useTopNavLinks>[0]> = {}) => {
    return renderHook(
      () =>
        useTopNavLinks({
          dataView: dataViewMock,
          onOpenInspector: jest.fn(),
          services,
          state,
          hasUnsavedChanges: false,
          isEsqlMode: false,
          adHocDataViews: [],
          hasShareIntegration,
          persistedDiscoverSession: undefined,
          ...hookAttrs,
        }),
      {
        wrapper: Wrapper,
      }
    ).result.current;
  };

  it('should return results', () => {
    const appMenuConfig = setup();

    expect(appMenuConfig.items).toBeDefined();
    expect(appMenuConfig.items?.length).toBeGreaterThan(0);

    // Check for key items
    const itemIds = appMenuConfig.items?.map((item) => item.id);
    expect(itemIds).toContain('new');
    expect(itemIds).toContain('open');

    // Check primary action item (Save)
    expect(appMenuConfig.primaryActionItem).toBeDefined();
    expect(appMenuConfig.primaryActionItem?.label).toBe('Save');
  });

  describe('when ES|QL mode is true', () => {
    it('should NOT include the esql secondary action item', () => {
      const appMenuConfig = setup({
        isEsqlMode: true,
      });

      expect(appMenuConfig.items).toBeDefined();
      expect(appMenuConfig.secondaryActionItem).toBeUndefined();
    });
  });

  describe('when ES|QL mode is false (classic mode)', () => {
    it('should include the esql secondary action item', () => {
      const appMenuConfig = setup({
        isEsqlMode: false,
      });

      expect(appMenuConfig.items).toBeDefined();
      expect(appMenuConfig.secondaryActionItem).toBeDefined();
      expect(appMenuConfig.secondaryActionItem?.id).toBe('esql');
      expect(appMenuConfig.secondaryActionItem?.label).toBe('ES|QL');
    });
  });

  describe('when share service included', () => {
    beforeAll(() => {
      services.share = sharePluginMock.createStartContract();
      jest.spyOn(services.share, 'availableIntegrations').mockReturnValue([]);
    });

    afterAll(() => {
      services.share = undefined;
    });

    it('should include the share menu item', () => {
      const appMenuConfig = setup();

      expect(appMenuConfig.items).toBeDefined();

      // Check for share item
      const shareItem = appMenuConfig.items?.find((item) => item.id === 'share');
      expect(shareItem).toBeDefined();
      expect(shareItem?.label).toBe('Share');
    });

    it('should include the export menu item', () => {
      jest
        .spyOn(services.share!, 'availableIntegrations')
        .mockImplementation((_objectType, groupId) => {
          if (groupId === 'export') {
            return [
              {
                id: 'csvReports',
                shareType: 'integration' as const,
                groupId: 'export',
                config: () => Promise.resolve({}),
              },
            ];
          }
          return [];
        });

      const appMenuConfig = renderHook(
        () =>
          useTopNavLinks({
            dataView: dataViewMock,
            onOpenInspector: jest.fn(),
            services,
            state,
            hasUnsavedChanges: false,
            isEsqlMode: false,
            adHocDataViews: [],
            hasShareIntegration: true,
            persistedDiscoverSession: undefined,
          }),
        {
          wrapper: Wrapper,
        }
      ).result.current;

      const exportItem = appMenuConfig.items?.find((item) => item.id === 'export');
      expect(exportItem).toBeDefined();
      expect(exportItem?.label).toBe('Export');

      expect(exportItem?.items).toBeDefined();
      expect(exportItem?.items?.length).toBeGreaterThan(0);

      const shareItem = appMenuConfig.items?.find((item) => item.id === 'share');
      expect(shareItem).toBeDefined();
    });
  });

  describe('when background search is enabled', () => {
    beforeEach(() => {
      services.data.search.isBackgroundSearchEnabled = true;
    });

    afterEach(() => {
      services.data.search.isBackgroundSearchEnabled = false;
    });

    it('should return the background search menu item', () => {
      const appMenuConfig = setup();

      const backgroundSearchItem = appMenuConfig.items?.find(
        (item) => item.id === 'backgroundSearch'
      );
      expect(backgroundSearchItem).toBeDefined();
    });
  });

  describe('when background search is disabled', () => {
    it('should NOT return the background search menu item', () => {
      const appMenuConfig = setup();

      const backgroundSearchItem = appMenuConfig.items?.find(
        (item) => item.id === 'backgroundSearch'
      );
      expect(backgroundSearchItem).toBeUndefined();
    });
  });

  describe('save button with unsaved changes', () => {
    it('should show notification indicator when there are unsaved changes', () => {
      const appMenuConfig = setup({ hasUnsavedChanges: true });

      expect(appMenuConfig.primaryActionItem).toBeDefined();
      expect(appMenuConfig.primaryActionItem?.id).toBe('save');
      expect(appMenuConfig.primaryActionItem?.splitButtonProps?.showNotificationIndicator).toBe(
        true
      );
      expect(
        appMenuConfig.primaryActionItem?.splitButtonProps?.notifcationIndicatorTooltipContent
      ).toBe('You have unsaved changes');
    });

    it('should NOT show notification indicator when there are no unsaved changes', () => {
      const appMenuConfig = setup({ hasUnsavedChanges: false });

      expect(appMenuConfig.primaryActionItem).toBeDefined();
      expect(appMenuConfig.primaryActionItem?.id).toBe('save');
      expect(appMenuConfig.primaryActionItem?.splitButtonProps?.showNotificationIndicator).toBe(
        false
      );
      expect(
        appMenuConfig.primaryActionItem?.splitButtonProps?.notifcationIndicatorTooltipContent
      ).toBeUndefined();
    });

    it('should include Save as and Reset changes options in split button menu', () => {
      const appMenuConfig = setup({ hasUnsavedChanges: true });

      expect(appMenuConfig.primaryActionItem?.splitButtonProps?.items).toBeDefined();
      const itemIds = appMenuConfig.primaryActionItem?.splitButtonProps?.items?.map(
        (item) => item.id
      );
      expect(itemIds).toContain('saveAs');
      expect(itemIds).toContain('resetChanges');
    });

    it('should have correct labels for split button menu items', () => {
      const appMenuConfig = setup({ hasUnsavedChanges: true });

      const items = appMenuConfig.primaryActionItem?.splitButtonProps?.items;
      const saveAsItem = items?.find((item) => item.id === 'saveAs');
      const resetChangesItem = items?.find((item) => item.id === 'resetChanges');

      expect(saveAsItem?.label).toBe('Save as');
      expect(resetChangesItem?.label).toBe('Reset changes');
    });

    it('should have run functions defined for split button menu items', () => {
      const appMenuConfig = setup({ hasUnsavedChanges: true });

      const items = appMenuConfig.primaryActionItem?.splitButtonProps?.items;
      const saveAsItem = items?.find((item) => item.id === 'saveAs');
      const resetChangesItem = items?.find((item) => item.id === 'resetChanges');

      expect(saveAsItem?.run).toBeDefined();
      expect(resetChangesItem?.run).toBeDefined();
    });

    it('should disable reset changes button when there are no unsaved changes', () => {
      const appMenuConfig = setup({ hasUnsavedChanges: false });

      const items = appMenuConfig.primaryActionItem?.splitButtonProps?.items;
      const resetChangesItem = items?.find((item) => item.id === 'resetChanges');

      expect(resetChangesItem?.disableButton).toBe(true);
    });

    it('should enable reset changes button when there are unsaved changes', () => {
      const appMenuConfig = setup({ hasUnsavedChanges: true });

      const items = appMenuConfig.primaryActionItem?.splitButtonProps?.items;
      const resetChangesItem = items?.find((item) => item.id === 'resetChanges');

      expect(resetChangesItem?.disableButton).toBe(false);
    });
  });

  describe('alerting v2 rules menu', () => {
    const setupWithAlertingV2 = (
      hookAttrs: Partial<Parameters<typeof useTopNavLinks>[0]> = {},
      alertingV2Enabled = true
    ) => {
      const baseMock = createDiscoverServicesMock();
      const v2Services = createTestServices({
        capabilities: {
          ...baseMock.capabilities,
          discover_v2: {
            save: true,
            storeSearchSession: true,
          },
          alertingVTwo: {
            uiEnabled: alertingV2Enabled,
          },
          management: {
            ...baseMock.capabilities.management,
            insightsAndAlerting: {
              triggersActions: true,
            },
          },
        },
      });

      const v2State = getDiscoverStateMock({ isTimeBased: true });
      v2State.internalState.dispatch(
        v2State.injectCurrentTab(internalStateActions.assignNextDataView)({
          dataView: dataViewMock,
        })
      );

      const V2Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
        return (
          <DiscoverTestProvider
            services={v2Services}
            stateContainer={v2State}
            runtimeState={{
              currentDataView: dataViewMock,
              adHocDataViews: [],
            }}
          >
            {children}
          </DiscoverTestProvider>
        );
      };

      return renderHook(
        () =>
          useTopNavLinks({
            dataView: dataViewMock,
            onOpenInspector: jest.fn(),
            services: v2Services,
            state: v2State,
            hasUnsavedChanges: false,
            isEsqlMode: true, // Default to ES|QL mode for v2 tests
            adHocDataViews: [],
            hasShareIntegration: false,
            persistedDiscoverSession: undefined,
            ...hookAttrs,
          }),
        {
          wrapper: V2Wrapper,
        }
      ).result.current;
    };

    it('should include the createRule menu item when in ES|QL mode and alerting v2 is enabled', () => {
      const appMenuConfig = setupWithAlertingV2({ isEsqlMode: true }, true);

      const createRuleItem = appMenuConfig.items?.find(
        (item) => item.id === AppMenuActionId.createRule
      );
      expect(createRuleItem).toBeDefined();
      expect(createRuleItem?.label).toBe('Rules');
    });

    it('should NOT include the createRule menu item when not in ES|QL mode', () => {
      const appMenuConfig = setupWithAlertingV2({ isEsqlMode: false }, true);

      const createRuleItem = appMenuConfig.items?.find(
        (item) => item.id === AppMenuActionId.createRule
      );
      expect(createRuleItem).toBeUndefined();
    });

    it('should NOT include the createRule menu item when alerting v2 is disabled', () => {
      const appMenuConfig = setupWithAlertingV2({ isEsqlMode: true }, false);

      const createRuleItem = appMenuConfig.items?.find(
        (item) => item.id === AppMenuActionId.createRule
      );
      expect(createRuleItem).toBeUndefined();
    });

    it('should include the legacy alerts menu when not in ES|QL mode', () => {
      const appMenuConfig = setupWithAlertingV2({ isEsqlMode: false }, true);

      const alertsItem = appMenuConfig.items?.find((item) => item.id === AppMenuActionId.alerts);
      expect(alertsItem).toBeDefined();
    });

    it('should NOT include the legacy alerts menu when in ES|QL mode and v2 is enabled', () => {
      const appMenuConfig = setupWithAlertingV2({ isEsqlMode: true }, true);

      const alertsItem = appMenuConfig.items?.find((item) => item.id === AppMenuActionId.alerts);
      expect(alertsItem).toBeUndefined();
    });

    it('should include legacy alerts menu when in ES|QL mode but v2 is disabled', () => {
      const appMenuConfig = setupWithAlertingV2({ isEsqlMode: true }, false);

      const alertsItem = appMenuConfig.items?.find((item) => item.id === AppMenuActionId.alerts);
      expect(alertsItem).toBeDefined();
    });
  });
});
