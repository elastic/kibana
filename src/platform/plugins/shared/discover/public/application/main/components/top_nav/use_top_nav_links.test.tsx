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
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { AppMenuActionId } from '@kbn/discover-utils';
import { BehaviorSubject } from 'rxjs';
import { triggersActionsUiMock } from '@kbn/triggers-actions-ui-plugin/public/mocks';
import { useTopNavLinks } from './use_top_nav_links';
import { getDiscoverInternalStateMock } from '../../../../__mocks__/discover_state.mock';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import { DiscoverToolkitTestProvider } from '../../../../__mocks__/test_provider';
import { internalStateActions } from '../../state_management/redux';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import type { DiscoverServices } from '../../../../build_services';

jest.mock('@kbn/alerts-ui-shared', () => ({
  ...jest.requireActual('@kbn/alerts-ui-shared'),
  useGetRuleTypesPermissions: jest.fn(() => ({
    authorizedRuleTypes: [
      {
        id: '.es-query',
        authorizedConsumers: {
          discover: { all: true, read: true },
        },
      },
    ],
  })),
}));

const createTestServices = (overrides: Partial<DiscoverServices> = {}): DiscoverServices => {
  const services = createDiscoverServicesMock();
  const uiSettingsGetMock = services.uiSettings.get;

  services.share = sharePluginMock.createStartContract();
  services.application.currentAppId$ = new BehaviorSubject('discover');
  services.capabilities.discover_v2 = {
    save: true,
    storeSearchSession: true,
  };
  services.capabilities.management = {
    ...services.capabilities.management,
    insightsAndAlerting: {
      triggersActions: true,
    },
  };
  services.uiSettings.get = <T,>(key: string) => {
    return key === ENABLE_ESQL ? (true as T) : uiSettingsGetMock<T>(key);
  };

  // Apply overrides
  return {
    ...services,
    ...overrides,
    capabilities: {
      ...services.capabilities,
      ...overrides.capabilities,
    },
  } as DiscoverServices;
};

describe('useTopNavLinks', () => {
  const setup = async (hookAttrs: Partial<Parameters<typeof useTopNavLinks>[0]> = {}) => {
    const services = hookAttrs.services ?? createTestServices();
    const toolkit = getDiscoverInternalStateMock({ services });

    await toolkit.initializeTabs();

    await toolkit.initializeSingleTab({
      tabId: toolkit.getCurrentTab().id,
    });

    return renderHook(
      () =>
        useTopNavLinks({
          dataView: dataViewMock,
          services,
          hasUnsavedChanges: false,
          isEsqlMode: false,
          adHocDataViews: [],
          hasShareIntegration: false,
          persistedDiscoverSession: undefined,
          ...hookAttrs,
          onOpenSaveModal: hookAttrs.onOpenSaveModal ?? jest.fn(),
          onOpenSaveAsModal: hookAttrs.onOpenSaveAsModal ?? jest.fn(),
        }),
      {
        wrapper: ({ children }) => (
          <DiscoverToolkitTestProvider toolkit={toolkit}>{children}</DiscoverToolkitTestProvider>
        ),
      }
    ).result.current;
  };

  it('should return results', async () => {
    const appMenuConfig = await setup();

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
    it('should NOT include the esql item', async () => {
      const appMenuConfig = await setup({
        isEsqlMode: true,
      });

      expect(appMenuConfig.items).toBeDefined();
      const itemIds = appMenuConfig.items?.map((item) => item.id);
      expect(itemIds).not.toContain('esql');
    });
  });

  describe('when ES|QL mode is false (classic mode)', () => {
    it('should include the esql item', async () => {
      const appMenuConfig = await setup({
        isEsqlMode: false,
      });

      expect(appMenuConfig.items).toBeDefined();
      const itemIds = appMenuConfig.items?.map((item) => item.id);
      expect(itemIds).toContain('esql');
    });
  });

  describe('when share service included', () => {
    it('should include the share menu item', async () => {
      const services = createTestServices();

      jest.spyOn(services.share!, 'availableIntegrations').mockReturnValue([]);

      const appMenuConfig = await setup({ hasShareIntegration: true, services });

      expect(appMenuConfig.items).toBeDefined();

      // Check for share item
      const shareItem = appMenuConfig.items?.find((item) => item.id === 'share');
      expect(shareItem).toBeDefined();
      expect(shareItem?.label).toBe('Share');
    });

    it('should include the export menu item', async () => {
      const services = createTestServices();

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

      const appMenuConfig = await setup({ hasShareIntegration: true, services });

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
    it('should return the background search menu item', async () => {
      const services = createTestServices();
      services.data.search.isBackgroundSearchEnabled = true;
      const appMenuConfig = await setup({ services });

      const backgroundSearchItem = appMenuConfig.items?.find(
        (item) => item.id === 'backgroundSearch'
      );
      expect(backgroundSearchItem).toBeDefined();
    });
  });

  describe('when background search is disabled', () => {
    it('should NOT return the background search menu item', async () => {
      const appMenuConfig = await setup();

      const backgroundSearchItem = appMenuConfig.items?.find(
        (item) => item.id === 'backgroundSearch'
      );
      expect(backgroundSearchItem).toBeUndefined();
    });
  });

  describe('inspect menu item', () => {
    it('should include the inspect menu item when onOpenInspector is provided', async () => {
      const appMenuConfig = await setup({ onOpenInspector: jest.fn() });

      const inspectItem = appMenuConfig.items?.find((item) => item.id === 'inspect');
      expect(inspectItem).toBeDefined();
      expect(inspectItem?.label).toBe('Inspect');
    });

    it('should NOT include the inspect menu item when onOpenInspector is not provided', async () => {
      const appMenuConfig = await setup();

      const inspectItem = appMenuConfig.items?.find((item) => item.id === 'inspect');
      expect(inspectItem).toBeUndefined();
    });
  });

  describe('save as button', () => {
    it('should disable save as button when session is not persisted', async () => {
      const appMenuConfig = await setup({ persistedDiscoverSession: undefined });

      const items = appMenuConfig.primaryActionItem?.splitButtonProps?.items;
      const saveAsItem = items?.find((item) => item.id === 'saveAs');

      expect(saveAsItem?.disableButton).toBe(true);
    });

    it('should enable save as button when session is persisted', async () => {
      const persistedSession = {
        id: 'test-session-id',
        title: 'Test Session',
        description: 'Test Description',
        tags: [],
        managed: false,
        tabs: [],
        timeRestore: false,
      };
      const appMenuConfig = await setup({ persistedDiscoverSession: persistedSession });

      const items = appMenuConfig.primaryActionItem?.splitButtonProps?.items;
      const saveAsItem = items?.find((item) => item.id === 'saveAs');

      expect(saveAsItem?.disableButton).toBe(false);
    });
  });

  describe('save button with unsaved changes', () => {
    it('should show notification indicator when there are unsaved changes', async () => {
      const appMenuConfig = await setup({ hasUnsavedChanges: true });

      expect(appMenuConfig.primaryActionItem).toBeDefined();
      expect(appMenuConfig.primaryActionItem?.id).toBe('save');
      expect(appMenuConfig.primaryActionItem?.splitButtonProps?.showNotificationIndicator).toBe(
        true
      );
      expect(
        appMenuConfig.primaryActionItem?.splitButtonProps?.notifcationIndicatorTooltipContent
      ).toBe('You have unsaved changes');
    });

    it('should NOT show notification indicator when there are no unsaved changes', async () => {
      const appMenuConfig = await setup({ hasUnsavedChanges: false });

      expect(appMenuConfig.primaryActionItem).toBeDefined();
      expect(appMenuConfig.primaryActionItem?.id).toBe('save');
      expect(appMenuConfig.primaryActionItem?.splitButtonProps?.showNotificationIndicator).toBe(
        false
      );
      expect(
        appMenuConfig.primaryActionItem?.splitButtonProps?.notifcationIndicatorTooltipContent
      ).toBeUndefined();
    });

    it('should include Save as and Reset changes options in split button menu', async () => {
      const appMenuConfig = await setup({ hasUnsavedChanges: true });

      expect(appMenuConfig.primaryActionItem?.splitButtonProps?.items).toBeDefined();
      const itemIds = appMenuConfig.primaryActionItem?.splitButtonProps?.items?.map(
        (item) => item.id
      );
      expect(itemIds).toContain('saveAs');
      expect(itemIds).toContain('resetChanges');
    });

    it('should have correct labels for split button menu items', async () => {
      const appMenuConfig = await setup({ hasUnsavedChanges: true });

      const items = appMenuConfig.primaryActionItem?.splitButtonProps?.items;
      const saveAsItem = items?.find((item) => item.id === 'saveAs');
      const resetChangesItem = items?.find((item) => item.id === 'resetChanges');

      expect(saveAsItem?.label).toBe('Save as');
      expect(resetChangesItem?.label).toBe('Reset changes');
    });

    it('should have run functions defined for split button menu items', async () => {
      const appMenuConfig = await setup({ hasUnsavedChanges: true });

      const items = appMenuConfig.primaryActionItem?.splitButtonProps?.items;
      const saveAsItem = items?.find((item) => item.id === 'saveAs');
      const resetChangesItem = items?.find((item) => item.id === 'resetChanges');

      expect(saveAsItem?.run).toBeDefined();
      expect(resetChangesItem?.run).toBeDefined();
    });

    it('should disable reset changes button when there are no unsaved changes', async () => {
      const appMenuConfig = await setup({ hasUnsavedChanges: false });

      const items = appMenuConfig.primaryActionItem?.splitButtonProps?.items;
      const resetChangesItem = items?.find((item) => item.id === 'resetChanges');

      expect(resetChangesItem?.disableButton).toBe(true);
    });

    it('should enable reset changes button when there are unsaved changes', async () => {
      const appMenuConfig = await setup({ hasUnsavedChanges: true });

      const items = appMenuConfig.primaryActionItem?.splitButtonProps?.items;
      const resetChangesItem = items?.find((item) => item.id === 'resetChanges');

      expect(resetChangesItem?.disableButton).toBe(false);
    });
  });

  describe('alerting v2 rules menu', () => {
    const setupWithAlertingV2 = async (
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
          ...(alertingV2Enabled ? { alertingVTwo: {} } : {}),
          management: {
            ...baseMock.capabilities.management,
            insightsAndAlerting: {
              triggersActions: true,
            },
          },
        },
        triggersActionsUi: triggersActionsUiMock.createStart(),
      });

      const toolkit = getDiscoverInternalStateMock({ services: v2Services });
      await toolkit.initializeTabs();
      await toolkit.initializeSingleTab({
        tabId: toolkit.getCurrentTab().id,
      });
      toolkit.internalState.dispatch(
        toolkit.injectCurrentTab(internalStateActions.assignNextDataView)({
          dataView: dataViewMock,
        })
      );

      return renderHook(
        () =>
          useTopNavLinks({
            dataView: dataViewMock,
            onOpenInspector: jest.fn(),
            services: v2Services,
            hasUnsavedChanges: false,
            isEsqlMode: true,
            adHocDataViews: [],
            hasShareIntegration: false,
            persistedDiscoverSession: undefined,
            ...hookAttrs,
            onOpenSaveModal: hookAttrs.onOpenSaveModal ?? jest.fn(),
            onOpenSaveAsModal: hookAttrs.onOpenSaveAsModal ?? jest.fn(),
          }),
        {
          wrapper: ({ children }) => (
            <DiscoverToolkitTestProvider toolkit={toolkit}>{children}</DiscoverToolkitTestProvider>
          ),
        }
      ).result.current;
    };

    it('should include the alerts menu when in ES|QL mode and alerting v2 is enabled', async () => {
      const appMenuConfig = await setupWithAlertingV2({ isEsqlMode: true }, true);

      const alertsItem = appMenuConfig.items?.find((item) => item.id === AppMenuActionId.alerts);
      expect(alertsItem).toBeDefined();
      expect(alertsItem?.label).toBe('Alerts');

      const createRuleTopLevel = appMenuConfig.items?.find(
        (item) => item.id === AppMenuActionId.createRule
      );
      expect(createRuleTopLevel).toBeUndefined();
    });

    it('should prepend the v2 ES|QL rule row inside the alerts popover when v2 is enabled', async () => {
      const appMenuConfig = await setupWithAlertingV2({ isEsqlMode: true }, true);

      const alertsItem = appMenuConfig.items?.find((item) => item.id === AppMenuActionId.alerts);
      expect(alertsItem?.items).toBeDefined();

      const v2Row = alertsItem?.items?.find((item) => item.id === 'create-esql-rule-v2');
      expect(v2Row).toBeDefined();
      expect(v2Row?.order).toBe(0);
      expect(v2Row?.labelBadgeText).toBe('New');
    });

    it('should NOT include the v2 row when not in ES|QL mode', async () => {
      const appMenuConfig = await setupWithAlertingV2({ isEsqlMode: false }, true);

      const alertsItem = appMenuConfig.items?.find((item) => item.id === AppMenuActionId.alerts);
      expect(alertsItem).toBeDefined();

      const v2Row = alertsItem?.items?.find((item) => item.id === 'create-esql-rule-v2');
      expect(v2Row).toBeUndefined();
    });

    it('should NOT include the v2 row when alerting v2 is disabled', async () => {
      const appMenuConfig = await setupWithAlertingV2({ isEsqlMode: true }, false);

      const alertsItem = appMenuConfig.items?.find((item) => item.id === AppMenuActionId.alerts);
      expect(alertsItem).toBeDefined();

      const v2Row = alertsItem?.items?.find((item) => item.id === 'create-esql-rule-v2');
      expect(v2Row).toBeUndefined();
    });

    it('should include alerts menu in both ES|QL and classic modes', async () => {
      const esqlConfig = await setupWithAlertingV2({ isEsqlMode: true }, true);
      const classicConfig = await setupWithAlertingV2({ isEsqlMode: false }, true);

      expect(esqlConfig.items?.find((item) => item.id === AppMenuActionId.alerts)).toBeDefined();
      expect(classicConfig.items?.find((item) => item.id === AppMenuActionId.alerts)).toBeDefined();
    });
  });
});
