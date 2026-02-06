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
import { BehaviorSubject } from 'rxjs';
import { useTopNavLinks } from './use_top_nav_links';
import { getDiscoverInternalStateMock } from '../../../../__mocks__/discover_state.mock';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import { DiscoverToolkitTestProvider } from '../../../../__mocks__/test_provider';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';

jest.mock('@kbn/alerts-ui-shared', () => ({
  ...jest.requireActual('@kbn/alerts-ui-shared'),
  useGetRuleTypesPermissions: jest.fn().mockReturnValue({ authorizedRuleTypes: [] }),
}));

describe('useTopNavLinks', () => {
  const getServices = () => {
    const services = createDiscoverServicesMock();
    const uiSettingsGetMock = services.uiSettings.get;

    services.share = sharePluginMock.createStartContract();
    services.application.currentAppId$ = new BehaviorSubject('discover');
    services.capabilities.discover_v2 = {
      save: true,
      storeSearchSession: true,
    };
    services.uiSettings.get = <T,>(key: string) => {
      return key === ENABLE_ESQL ? (true as T) : uiSettingsGetMock<T>(key);
    };

    return services;
  };

  const setup = async (hookAttrs: Partial<Parameters<typeof useTopNavLinks>[0]> = {}) => {
    const services = hookAttrs.services ?? getServices();
    const toolkit = getDiscoverInternalStateMock({ services });

    await toolkit.initializeTabs();

    const { stateContainer } = await toolkit.initializeSingleTab({
      tabId: toolkit.getCurrentTab().id,
    });

    return renderHook(
      () =>
        useTopNavLinks({
          dataView: dataViewMock,
          onOpenInspector: jest.fn(),
          services,
          state: stateContainer,
          hasUnsavedChanges: false,
          isEsqlMode: false,
          adHocDataViews: [],
          hasShareIntegration: false,
          persistedDiscoverSession: undefined,
          ...hookAttrs,
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
    it('should NOT include the esql secondary action item', async () => {
      const appMenuConfig = await setup({
        isEsqlMode: true,
      });

      expect(appMenuConfig.items).toBeDefined();
      expect(appMenuConfig.secondaryActionItem).toBeUndefined();
    });
  });

  describe('when ES|QL mode is false (classic mode)', () => {
    it('should include the esql secondary action item', async () => {
      const appMenuConfig = await setup({
        isEsqlMode: false,
      });

      expect(appMenuConfig.items).toBeDefined();
      expect(appMenuConfig.secondaryActionItem).toBeDefined();
      expect(appMenuConfig.secondaryActionItem?.id).toBe('esql');
      expect(appMenuConfig.secondaryActionItem?.label).toBe('ES|QL');
    });
  });

  describe('when share service included', () => {
    it('should include the share menu item', async () => {
      const services = getServices();

      jest.spyOn(services.share!, 'availableIntegrations').mockReturnValue([]);

      const appMenuConfig = await setup({ hasShareIntegration: true, services });

      expect(appMenuConfig.items).toBeDefined();

      // Check for share item
      const shareItem = appMenuConfig.items?.find((item) => item.id === 'share');
      expect(shareItem).toBeDefined();
      expect(shareItem?.label).toBe('Share');
    });

    it('should include the export menu item', async () => {
      const services = getServices();

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
      const services = getServices();
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
});
