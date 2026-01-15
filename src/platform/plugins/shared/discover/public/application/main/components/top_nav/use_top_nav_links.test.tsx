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
import { useTopNavLinks } from './use_top_nav_links';
import type { DiscoverServices } from '../../../../build_services';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import { DiscoverTestProvider } from '../../../../__mocks__/test_provider';

describe('useTopNavLinks', () => {
  const services = {
    ...createDiscoverServicesMock(),
    capabilities: {
      discover_v2: {
        save: true,
      },
    },
    uiSettings: {
      get: jest.fn(() => true),
    },
  } as unknown as DiscoverServices;

  const state = getDiscoverStateMock({ isTimeBased: true });
  state.actions.setDataView(dataViewMock);

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
          topNavCustomization: undefined,
          shouldShowESQLToDataViewTransitionModal: false,
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
    expect(appMenuConfig.items!.length).toBeGreaterThan(0);

    // Check for key items
    const itemIds = appMenuConfig.items!.map((item) => item.id);
    expect(itemIds).toContain('new');
    expect(itemIds).toContain('open');

    // Check primary action item (Save)
    expect(appMenuConfig.primaryActionItem).toBeDefined();
    expect(appMenuConfig.primaryActionItem?.label).toBe('Save');
  });

  describe('when ES|QL mode is true', () => {
    it('should return results', () => {
      const appMenuConfig = setup({
        isEsqlMode: true,
      });

      expect(appMenuConfig.items).toBeDefined();

      // Check for ESQL switch item
      const esqlItem = appMenuConfig.items!.find((item) => item.id === 'esql');
      expect(esqlItem).toBeDefined();
      expect(esqlItem?.label).toBe('Switch to classic');
    });
  });

  describe('when share service included', () => {
    beforeAll(() => {
      services.share = sharePluginMock.createStartContract();
    });

    afterAll(() => {
      services.share = undefined;
    });

    it('should include the share menu item', () => {
      const appMenuConfig = setup();

      expect(appMenuConfig.items).toBeDefined();

      // Check for share item
      const shareItem = appMenuConfig.items!.find((item) => item.id === 'share');
      expect(shareItem).toBeDefined();
      expect(shareItem?.label).toBe('Share');
    });

    it('should include the export menu item', () => {
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
            topNavCustomization: undefined,
            shouldShowESQLToDataViewTransitionModal: false,
            hasShareIntegration: true,
            persistedDiscoverSession: undefined,
          }),
        {
          wrapper: Wrapper,
        }
      ).result.current;

      // Check for share item with export popover items
      const shareItem = appMenuConfig.items!.find((item) => item.id === 'share');
      expect(shareItem).toBeDefined();

      // Export should be a popover item under share
      const exportItem = shareItem?.items?.find((item) => item.id === 'export');
      expect(exportItem).toBeDefined();
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

      const backgroundSearchItem = appMenuConfig.items!.find(
        (item) => item.id === 'backgroundSearch'
      );
      expect(backgroundSearchItem).toBeDefined();
    });
  });

  describe('when background search is disabled', () => {
    it('should NOT return the background search menu item', () => {
      const appMenuConfig = setup();

      const backgroundSearchItem = appMenuConfig.items!.find(
        (item) => item.id === 'backgroundSearch'
      );
      expect(backgroundSearchItem).toBeUndefined();
    });
  });
});
