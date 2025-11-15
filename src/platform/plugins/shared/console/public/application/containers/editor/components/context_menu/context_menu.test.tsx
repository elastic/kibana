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
      storage: {} as any,
      esHostService: {
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
  getDocumentation: jest.fn(() => Promise.resolve('https://elastic.co/docs')),
  autoIndent: jest.fn(),
  notifications: mockNotifications,
  currentLanguage: 'curl',
  onLanguageChange: jest.fn(),
  isKbnRequestSelected: false,
  onMenuOpen: jest.fn(),
  onCopyAs: jest.fn(() => Promise.resolve()),
};

describe('ContextMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
        expect(screen.getByTestId('consoleMenuCopyToLanguage')).toBeInTheDocument();
      });
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
      expect(screen.queryByTestId('consoleMenuCopyToLanguage')).not.toBeInTheDocument();
    });
  });
});
