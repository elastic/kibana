/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';

import type { AppMenuPopoverItem } from '@kbn/core-chrome-app-menu-components';
import type { ShareActionIntents } from '@kbn/share-plugin/public/types';
import { I18nProvider } from '@kbn/i18n-react';

import { buildMockDashboardApi } from '../../mocks';
import { DashboardContext } from '../../dashboard_api/use_dashboard_api';
import { coreServices, shareService } from '../../services/kibana_services';
import { useDashboardMenuItems } from './use_dashboard_menu_items';
import { BehaviorSubject } from 'rxjs';
import type { DashboardApi } from '../../dashboard_api/types';

describe('useDashboardMenuItems', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    jest
      .mocked(shareService!.availableIntegrations)
      .mockImplementation(() => [] as ShareActionIntents[]);
  });

  describe('Export', () => {
    test('does not include Export top-nav item when no export integrations are available', () => {
      const { api } = buildMockDashboardApi({ savedObjectId: 'test-id' });

      const { result } = renderHook(
        () =>
          useDashboardMenuItems({
            isLabsShown: false,
            setIsLabsShown: jest.fn(),
            maybeRedirect: jest.fn(),
          }),
        {
          wrapper: ({ children }) => (
            <I18nProvider>
              <DashboardContext.Provider value={api}>{children}</DashboardContext.Provider>
            </I18nProvider>
          ),
        }
      );

      const viewModeItemIds = result.current.viewModeTopNavConfig.items!.map(({ id }) => id);
      expect(viewModeItemIds).not.toContain('export');

      const editModeItemIds = result.current.editModeTopNavConfig.items!.map(({ id }) => id);
      expect(editModeItemIds).not.toContain('export');
    });

    test('includes Export top-nav item with JSON when only exportDerivatives integrations are available', () => {
      const { api } = buildMockDashboardApi({ savedObjectId: 'test-id' });

      jest
        .mocked(shareService!.availableIntegrations)
        .mockImplementation((_objectType: string, groupId?: string): ShareActionIntents[] => {
          if (groupId === 'export') {
            return [];
          }

          if (groupId === 'exportDerivatives') {
            return [
              {
                id: 'exportJson',
                shareType: 'integration',
                groupId: 'exportDerivatives',
                config: async () => ({}),
              } as unknown as ShareActionIntents,
            ];
          }

          return [];
        });

      const { result } = renderHook(
        () =>
          useDashboardMenuItems({
            isLabsShown: false,
            setIsLabsShown: jest.fn(),
            maybeRedirect: jest.fn(),
          }),
        {
          wrapper: ({ children }) => (
            <I18nProvider>
              <DashboardContext.Provider value={api}>{children}</DashboardContext.Provider>
            </I18nProvider>
          ),
        }
      );

      const viewModeExportMenuItem = result.current.viewModeTopNavConfig.items!.find(
        ({ id }) => id === 'export'
      );
      expect(viewModeExportMenuItem).toBeDefined();
      expect((viewModeExportMenuItem as unknown as { run?: unknown }).run).toBeDefined();
      expect((viewModeExportMenuItem as unknown as AppMenuPopoverItem).items).toBeUndefined();

      const editModeExportMenuItem = result.current.editModeTopNavConfig.items!.find(
        ({ id }) => id === 'export'
      );
      expect(editModeExportMenuItem).toBeDefined();
      expect((editModeExportMenuItem as unknown as { run?: unknown }).run).toBeDefined();
      expect((editModeExportMenuItem as unknown as AppMenuPopoverItem).items).toBeUndefined();
    });

    test('includes Export top-nav item with JSON and Reporting items when export and exportDerivatives integrations are available', () => {
      const { api } = buildMockDashboardApi({ savedObjectId: 'test-id' });

      jest
        .mocked(shareService!.availableIntegrations)
        .mockImplementation((_objectType: string, groupId?: string): ShareActionIntents[] => {
          if (groupId === 'export') {
            return [
              {
                id: 'pdfReports',
                shareType: 'integration',
                groupId: 'export',
                config: async () => ({}),
              } as unknown as ShareActionIntents,
              {
                id: 'imageReports',
                shareType: 'integration',
                groupId: 'export',
                config: async () => ({}),
              } as unknown as ShareActionIntents,
            ];
          }

          if (groupId === 'exportDerivatives') {
            return [
              {
                id: 'exportJson',
                shareType: 'integration',
                groupId: 'exportDerivatives',
                config: async () => ({}),
              } as unknown as ShareActionIntents,
            ];
          }

          return [];
        });

      const { result } = renderHook(
        () =>
          useDashboardMenuItems({
            isLabsShown: false,
            setIsLabsShown: jest.fn(),
            maybeRedirect: jest.fn(),
          }),
        {
          wrapper: ({ children }) => (
            <I18nProvider>
              <DashboardContext.Provider value={api}>{children}</DashboardContext.Provider>
            </I18nProvider>
          ),
        }
      );

      const viewModeExportMenuItem = result.current.viewModeTopNavConfig.items!.find(
        ({ id }) => id === 'export'
      ) as AppMenuPopoverItem;

      const viewModeExportItemIds = viewModeExportMenuItem.items!.map((item) => item.id);
      expect(viewModeExportItemIds).toEqual(
        expect.arrayContaining(['exportJson', 'pdfReports', 'imageReports'])
      );

      const editModeExportMenuItem = result.current.editModeTopNavConfig.items!.find(
        ({ id }) => id === 'export'
      ) as AppMenuPopoverItem;

      const editModeExportItemIds = editModeExportMenuItem.items!.map((item) => item.id);
      expect(editModeExportItemIds).toEqual(
        expect.arrayContaining(['exportJson', 'pdfReports', 'imageReports'])
      );
    });
  });

  describe('run switchToViewMode', () => {
    describe('dashboard does not have unsaved changes', () => {
      test('should switch to view mode', () => {
        const { api } = buildMockDashboardApi({ savedObjectId: 'test-id' });
        const mockSetViewMode = jest.fn();

        const { result } = renderHook(
          () =>
            useDashboardMenuItems({
              isLabsShown: false,
              setIsLabsShown: jest.fn(),
              maybeRedirect: jest.fn(),
            }),
          {
            wrapper: ({ children }) => (
              <I18nProvider>
                <DashboardContext.Provider
                  value={{
                    ...api,
                    setViewMode: mockSetViewMode,
                  }}
                >
                  {children}
                </DashboardContext.Provider>
              </I18nProvider>
            ),
          }
        );

        const switchToViewMode = result.current.editModeTopNavConfig.items?.find(
          ({ id }) => id === 'cancel'
        );
        expect(switchToViewMode).toBeDefined();
        switchToViewMode!.run?.();
        expect(mockSetViewMode).toHaveBeenCalledWith('view');
      });
    });

    describe('dashboard has unsaved changes', () => {
      const mockSetViewMode = jest.fn();
      const mockAsyncResetToLastSavedState = jest.fn();
      const hasUnsavedChanges$ = new BehaviorSubject(true) as DashboardApi['hasUnsavedChanges$'];

      function getMockDashboardApi() {
        const { api } = buildMockDashboardApi({ savedObjectId: 'test-id' });
        return {
          ...api,
          asyncResetToLastSavedState: mockAsyncResetToLastSavedState,
          setViewMode: mockSetViewMode,
          hasUnsavedChanges$,
        };
      }

      const mockApi = getMockDashboardApi();

      beforeEach(() => {
        mockSetViewMode.mockReset();
        mockAsyncResetToLastSavedState.mockReset();
      });

      test('should remain in edit mode and preserves changes on cancel', async () => {
        const { result } = renderHook(
          () =>
            useDashboardMenuItems({
              isLabsShown: false,
              setIsLabsShown: jest.fn(),
              maybeRedirect: jest.fn(),
            }),
          {
            wrapper: ({ children }) => (
              <I18nProvider>
                <DashboardContext.Provider value={mockApi}>{children}</DashboardContext.Provider>
              </I18nProvider>
            ),
          }
        );

        const openConfirmSpy = jest.spyOn(coreServices.overlays, 'openConfirm');
        openConfirmSpy.mockResolvedValueOnce(false);

        const switchToViewMode = result.current.editModeTopNavConfig.items?.find(
          ({ id }) => id === 'cancel'
        );
        expect(switchToViewMode).toBeDefined();
        switchToViewMode!.run?.();
        await waitFor(async () => {
          expect(openConfirmSpy).toHaveBeenCalled();
          expect(mockSetViewMode).not.toHaveBeenCalled();
          expect(mockAsyncResetToLastSavedState).not.toHaveBeenCalled();
        });
      });

      test('should switch to view mode and reset changes on accept', async () => {
        const { result } = renderHook(
          () =>
            useDashboardMenuItems({
              isLabsShown: false,
              setIsLabsShown: jest.fn(),
              maybeRedirect: jest.fn(),
            }),
          {
            wrapper: ({ children }) => (
              <I18nProvider>
                <DashboardContext.Provider value={mockApi}>{children}</DashboardContext.Provider>
              </I18nProvider>
            ),
          }
        );

        const openConfirmSpy = jest.spyOn(coreServices.overlays, 'openConfirm');
        openConfirmSpy.mockResolvedValueOnce(true);

        const switchToViewMode = result.current.editModeTopNavConfig.items?.find(
          ({ id }) => id === 'cancel'
        );
        expect(switchToViewMode).toBeDefined();
        switchToViewMode!.run?.();
        await waitFor(async () => {
          expect(openConfirmSpy).toHaveBeenCalled();
          expect(mockAsyncResetToLastSavedState).toHaveBeenCalled();
          expect(mockSetViewMode).toHaveBeenCalledWith('view');
        });
      });
    });
  });
});
