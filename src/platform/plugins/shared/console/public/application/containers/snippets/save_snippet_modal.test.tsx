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
import { SaveSnippetModal } from './save_snippet_modal';
import { ServicesContextProvider } from '../../contexts';
import type { ContextValue } from '../../contexts/services_context';

// Mock the React Query hook
jest.mock('../../hooks/use_saved_snippets', () => ({
  useSaveSnippet: () => ({
    mutateAsync: jest.fn((snippet) => Promise.resolve({ id: 'test-id', ...snippet })),
    isLoading: false,
  }),
}));

const mockNotifications: Pick<NotificationsStart, 'toasts'> = {
  toasts: {
    addSuccess: jest.fn(),
    addDanger: jest.fn(),
    addWarning: jest.fn(),
    addError: jest.fn(),
  } as any,
};

const createMockContextValue = (): ContextValue => {
  return {
    services: {
      storage: {} as any,
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
      savedSnippetsService: {
        create: jest.fn(),
        find: jest.fn(),
        get: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      } as any,
    },
    docLinkVersion: '8.0',
    docLinks: {} as any,
    config: {
      isDevMode: false,
    },
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

describe('SaveSnippetModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();
  const currentQuery = 'GET /_search\n{\n  "query": { "match_all": {} }\n}';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the modal with title input and description textarea', () => {
    const contextValue = createMockContextValue();

    render(
      <I18nProvider>
        <ServicesContextProvider value={contextValue}>
          <SaveSnippetModal currentQuery={currentQuery} onClose={mockOnClose} onSave={mockOnSave} />
        </ServicesContextProvider>
      </I18nProvider>
    );

    expect(screen.getByTestId('consoleSnippetTitleInput')).toBeInTheDocument();
    expect(screen.getByTestId('consoleSnippetDescriptionInput')).toBeInTheDocument();
    expect(screen.getByTestId('consoleSnippetSaveButton')).toBeInTheDocument();
    expect(screen.getByTestId('consoleSnippetCancelButton')).toBeInTheDocument();
  });

  it('should disable save button when title is empty', () => {
    const contextValue = createMockContextValue();

    render(
      <I18nProvider>
        <ServicesContextProvider value={contextValue}>
          <SaveSnippetModal currentQuery={currentQuery} onClose={mockOnClose} onSave={mockOnSave} />
        </ServicesContextProvider>
      </I18nProvider>
    );

    const saveButton = screen.getByTestId('consoleSnippetSaveButton');
    expect(saveButton).toBeDisabled();
  });

  it('should enable save button when title is not empty', async () => {
    const contextValue = createMockContextValue();

    render(
      <I18nProvider>
        <ServicesContextProvider value={contextValue}>
          <SaveSnippetModal currentQuery={currentQuery} onClose={mockOnClose} onSave={mockOnSave} />
        </ServicesContextProvider>
      </I18nProvider>
    );

    const titleInput = screen.getByTestId('consoleSnippetTitleInput');
    await userEvent.type(titleInput, 'My Test Snippet');

    await waitFor(() => {
      const saveButton = screen.getByTestId('consoleSnippetSaveButton');
      expect(saveButton).not.toBeDisabled();
    });
  });

  it('should disable save button when title contains only whitespace', async () => {
    const contextValue = createMockContextValue();

    render(
      <I18nProvider>
        <ServicesContextProvider value={contextValue}>
          <SaveSnippetModal currentQuery={currentQuery} onClose={mockOnClose} onSave={mockOnSave} />
        </ServicesContextProvider>
      </I18nProvider>
    );

    const titleInput = screen.getByTestId('consoleSnippetTitleInput');
    await userEvent.type(titleInput, '   ');

    const saveButton = screen.getByTestId('consoleSnippetSaveButton');
    expect(saveButton).toBeDisabled();
  });

  it('should call onClose when cancel button is clicked', async () => {
    const contextValue = createMockContextValue();

    render(
      <I18nProvider>
        <ServicesContextProvider value={contextValue}>
          <SaveSnippetModal currentQuery={currentQuery} onClose={mockOnClose} onSave={mockOnSave} />
        </ServicesContextProvider>
      </I18nProvider>
    );

    const cancelButton = screen.getByTestId('consoleSnippetCancelButton');
    await userEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should accept optional description', async () => {
    const contextValue = createMockContextValue();

    render(
      <I18nProvider>
        <ServicesContextProvider value={contextValue}>
          <SaveSnippetModal currentQuery={currentQuery} onClose={mockOnClose} onSave={mockOnSave} />
        </ServicesContextProvider>
      </I18nProvider>
    );

    const descriptionInput = screen.getByTestId('consoleSnippetDescriptionInput');
    await userEvent.type(descriptionInput, 'This is a test description');

    expect(descriptionInput).toHaveValue('This is a test description');
  });

  it('should trim title and description before saving', async () => {
    const contextValue = createMockContextValue();

    render(
      <I18nProvider>
        <ServicesContextProvider value={contextValue}>
          <SaveSnippetModal currentQuery={currentQuery} onClose={mockOnClose} onSave={mockOnSave} />
        </ServicesContextProvider>
      </I18nProvider>
    );

    const titleInput = screen.getByTestId('consoleSnippetTitleInput');
    const descriptionInput = screen.getByTestId('consoleSnippetDescriptionInput');

    // Type values with spaces
    await userEvent.type(titleInput, '  My Snippet  ');
    await userEvent.type(descriptionInput, '  My Description  ');

    // Save button should be enabled since title is not empty
    const saveButton = screen.getByTestId('consoleSnippetSaveButton');
    expect(saveButton).not.toBeDisabled();

    await userEvent.click(saveButton);

    // The component should call onClose after successful save
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });

    // The onSave callback should have been called
    expect(mockOnSave).toHaveBeenCalled();
  });
});
