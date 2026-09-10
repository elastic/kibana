/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import userEvent from '@testing-library/user-event';
import type { NotificationsStart } from '@kbn/core/public';
import { ContextMenu } from './context_menu';
import { ServicesContextProvider } from '../../../../contexts';
import type { ContextValue } from '../../../../contexts/services_context';
import { copyTextToClipboard } from '../../../../lib/copy_text_to_clipboard';

jest.mock('./language_selector_modal', () => ({
  LanguageSelectorModal: () => <div>Language Selector Modal</div>,
}));

jest.mock('../../../../../services', () => ({
  convertRequestToLanguage: jest.fn(() =>
    Promise.resolve({ data: 'mocked request code', error: null })
  ),
  StorageKeys: {
    DEFAULT_LANGUAGE: 'default_language',
  },
}));

jest.mock('../../../../lib/copy_text_to_clipboard', () => ({
  copyTextToClipboard: jest.fn(),
}));

const mockCopyTextToClipboard = copyTextToClipboard as jest.MockedFunction<
  typeof copyTextToClipboard
>;

const mockNotifications: Pick<NotificationsStart, 'toasts'> = {
  toasts: {
    addSuccess: jest.fn(),
    addDanger: jest.fn(),
    addWarning: jest.fn(),
  } as any,
};

const createMockContextValue = (isPackagedEnvironment?: boolean): ContextValue => {
  return {
    services: {
      storage: {
        get: jest.fn(() => 'curl'),
        set: jest.fn(),
      } as any,
      esHostService: {
        getHost: jest.fn(() => 'http://localhost:9200'),
        init: jest.fn(),
      } as any,
      history: {} as any,
      settings: {} as any,
      notifications: mockNotifications as any,
      objectStorageClient: {} as any,
      trackUiMetric: jest.fn() as any,
      http: {} as any,
      autocompleteInfo: {} as any,
      data: {} as any,
      licensing: {} as any,
      application: {} as any,
    },
    docLinkVersion: '8.0',
    docLinks: {} as any,
    config: {
      isDevMode: false,
      isPackagedEnvironment,
    },
    // Required properties from ConsoleStartServices
    analytics: {
      reportEvent: jest.fn(),
    },
    i18n: {} as any,
    theme: {
      theme$: jest.fn(),
    } as any,
    userProfile: {} as any,
  };
};

const defaultProps = {
  getRequests: jest.fn(() => Promise.resolve([{ method: 'GET', url: '/', data: [] }])),
  getDocumentation: jest.fn(() => Promise.resolve('https://elastic.co/docs')),
  autoIndent: jest.fn(),
  notifications: mockNotifications,
  getIsKbnRequestSelected: jest.fn(() => Promise.resolve(false)),
};

describe('ContextMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCopyTextToClipboard.mockResolvedValue(true);
  });

  describe('Copy to language', () => {
    it('shows a success toast after copying the converted request', async () => {
      const contextValue = createMockContextValue();

      render(
        <I18nProvider>
          <ServicesContextProvider value={contextValue}>
            <ContextMenu {...defaultProps} />
          </ServicesContextProvider>
        </I18nProvider>
      );

      await userEvent.click(screen.getByTestId('toggleConsoleMenu'));
      await userEvent.click(await screen.findByTestId('consoleMenuCopyAsButton'));

      await waitFor(() => expect(mockNotifications.toasts.addSuccess).toHaveBeenCalled());
      expect(mockCopyTextToClipboard).toHaveBeenCalledWith('mocked request code');
      expect(mockNotifications.toasts.addDanger).not.toHaveBeenCalled();
    });

    it('shows an error toast when copying the converted request fails', async () => {
      mockCopyTextToClipboard.mockResolvedValue(false);
      const contextValue = createMockContextValue();

      render(
        <I18nProvider>
          <ServicesContextProvider value={contextValue}>
            <ContextMenu {...defaultProps} />
          </ServicesContextProvider>
        </I18nProvider>
      );

      await userEvent.click(screen.getByTestId('toggleConsoleMenu'));
      await userEvent.click(await screen.findByTestId('consoleMenuCopyAsButton'));

      await waitFor(() => expect(mockNotifications.toasts.addDanger).toHaveBeenCalled());
      expect(mockNotifications.toasts.addSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Copy to language menu item visibility', () => {
    it('should show "Copy to language" menu item when not in isPackagedEnvironment', async () => {
      const contextValue = createMockContextValue(undefined);

      render(
        <I18nProvider>
          <ServicesContextProvider value={contextValue}>
            <ContextMenu {...defaultProps} />
          </ServicesContextProvider>
        </I18nProvider>
      );

      const menuButton = screen.getByTestId('toggleConsoleMenu');
      await userEvent.click(menuButton);

      await waitFor(() => {
        expect(screen.getByTestId('consoleMenuCopyAsButton')).toBeInTheDocument();
      });

      // Also verify "Select language" menu item is present
      expect(screen.getByTestId('consoleMenuSelectLanguage')).toBeInTheDocument();
    });

    it('should hide "Copy to language" menu item when isPackagedEnvironment is true', async () => {
      const contextValue = createMockContextValue(true);

      render(
        <I18nProvider>
          <ServicesContextProvider value={contextValue}>
            <ContextMenu {...defaultProps} />
          </ServicesContextProvider>
        </I18nProvider>
      );

      // Open the context menu
      const menuButton = screen.getByTestId('toggleConsoleMenu');
      await userEvent.click(menuButton);

      // Wait for the menu to open
      await waitFor(() => {
        expect(screen.getByTestId('consoleMenu')).toBeInTheDocument();
      });

      // Verify "Copy to language" button is NOT in the document
      expect(screen.queryByTestId('consoleMenuCopyAsButton')).not.toBeInTheDocument();

      // Also verify "Select language" menu item is NOT in the document
      expect(screen.queryByTestId('consoleMenuSelectLanguage')).not.toBeInTheDocument();
    });
  });
});
