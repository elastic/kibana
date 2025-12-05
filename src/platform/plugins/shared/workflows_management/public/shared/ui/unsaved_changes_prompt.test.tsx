/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '@kbn/i18n-react';
import { UnsavedChangesPrompt } from './unsaved_changes_prompt';

// Mock react-router-dom's Prompt component
let mockPromptMessage: ((location: any) => string | boolean) | null = null;
let mockLocation = { pathname: '/workflow-123' };

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Prompt: ({ when, message }: { when: boolean; message: (location: any) => string | boolean }) => {
    // Store the message function for testing
    mockPromptMessage = message;
    return when ? <div data-test-subj="unsaved-changes-prompt" /> : null;
  },
  useLocation: () => mockLocation,
}));

const renderWithProviders = (component: React.ReactElement, initialPath = '/workflow-123') => {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <I18nProvider>{component}</I18nProvider>
    </MemoryRouter>
  );
};

describe('UnsavedChangesPrompt', () => {
  let addEventListenerSpy: jest.SpyInstance;
  let removeEventListenerSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    // Clear any stored prompt message and reset location
    mockPromptMessage = null;
    mockLocation = { pathname: '/workflow-123' };
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  describe('Prompt rendering', () => {
    it('should render Prompt when hasUnsavedChanges is true and shouldPromptOnNavigation is true', () => {
      const { getByTestId } = renderWithProviders(
        <UnsavedChangesPrompt hasUnsavedChanges={true} shouldPromptOnNavigation={true} />
      );

      expect(getByTestId('unsaved-changes-prompt')).toBeInTheDocument();
    });

    it('should not render Prompt when hasUnsavedChanges is false', () => {
      const { queryByTestId } = renderWithProviders(
        <UnsavedChangesPrompt hasUnsavedChanges={false} shouldPromptOnNavigation={true} />
      );

      expect(queryByTestId('unsaved-changes-prompt')).not.toBeInTheDocument();
    });

    it('should not render Prompt when shouldPromptOnNavigation is false', () => {
      const { queryByTestId } = renderWithProviders(
        <UnsavedChangesPrompt hasUnsavedChanges={true} shouldPromptOnNavigation={false} />
      );

      expect(queryByTestId('unsaved-changes-prompt')).not.toBeInTheDocument();
    });

    it('should default shouldPromptOnNavigation to true', () => {
      const { getByTestId } = renderWithProviders(
        <UnsavedChangesPrompt hasUnsavedChanges={true} />
      );

      expect(getByTestId('unsaved-changes-prompt')).toBeInTheDocument();
    });
  });

  describe('beforeunload event handling', () => {
    it('should add beforeunload event listener when hasUnsavedChanges is true', () => {
      renderWithProviders(<UnsavedChangesPrompt hasUnsavedChanges={true} />);

      expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    });

    it('should add beforeunload event listener even when hasUnsavedChanges is false', () => {
      renderWithProviders(<UnsavedChangesPrompt hasUnsavedChanges={false} />);

      expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    });

    it('should remove beforeunload event listener on unmount', () => {
      const { unmount } = renderWithProviders(<UnsavedChangesPrompt hasUnsavedChanges={true} />);

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    });

    it('should update event listener when hasUnsavedChanges changes', () => {
      const { rerender } = renderWithProviders(<UnsavedChangesPrompt hasUnsavedChanges={false} />);

      // Should have added listener initially
      expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));

      // Rerender with hasUnsavedChanges true
      rerender(
        <MemoryRouter initialEntries={['/workflow-123']}>
          <I18nProvider>
            <UnsavedChangesPrompt hasUnsavedChanges={true} />
          </I18nProvider>
        </MemoryRouter>
      );

      // Should have called addEventListener again (and removeEventListener for cleanup)
      expect(addEventListenerSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('beforeunload event handler behavior', () => {
    it('should prevent default and set returnValue when hasUnsavedChanges is true', () => {
      renderWithProviders(<UnsavedChangesPrompt hasUnsavedChanges={true} />);

      const beforeUnloadHandler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'beforeunload'
      )?.[1];

      expect(beforeUnloadHandler).toBeDefined();

      const mockEvent = {
        preventDefault: jest.fn(),
        returnValue: '',
      } as any;

      beforeUnloadHandler(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.returnValue).toBe('');
    });

    it('should not prevent default when hasUnsavedChanges is false', () => {
      renderWithProviders(<UnsavedChangesPrompt hasUnsavedChanges={false} />);

      const beforeUnloadHandler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'beforeunload'
      )?.[1];

      expect(beforeUnloadHandler).toBeDefined();

      const mockEvent = {
        preventDefault: jest.fn(),
        returnValue: '',
      } as any;

      beforeUnloadHandler(mockEvent);

      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(mockEvent.returnValue).toBe('');
    });
  });

  describe('navigation message logic', () => {
    it('should allow navigation within the same workflow', () => {
      renderWithProviders(<UnsavedChangesPrompt hasUnsavedChanges={true} />, '/workflow-123');

      const messageFunction = mockPromptMessage;
      expect(messageFunction).toBeDefined();

      // Test navigation within same workflow
      const result = messageFunction!({ pathname: '/app/workflows/workflow-123' });
      expect(result).toBe(true);
    });

    it('should show confirmation message when navigating to different workflow', () => {
      renderWithProviders(<UnsavedChangesPrompt hasUnsavedChanges={true} />, '/workflow-123');

      const messageFunction = mockPromptMessage;
      expect(messageFunction).toBeDefined();

      // Test navigation to different workflow
      const result = messageFunction!({ pathname: '/app/workflows/workflow-456' });
      expect(result).toBe('Your changes have not been saved. Are you sure you want to leave?');
    });

    it('should show confirmation message when navigating to create page', () => {
      renderWithProviders(<UnsavedChangesPrompt hasUnsavedChanges={true} />, '/workflow-123');

      const messageFunction = mockPromptMessage;
      expect(messageFunction).toBeDefined();

      // Test navigation to create page
      const result = messageFunction!({ pathname: '/app/workflows/create' });
      expect(result).toBe('Your changes have not been saved. Are you sure you want to leave?');
    });

    it('should show confirmation message when navigating outside workflows', () => {
      renderWithProviders(<UnsavedChangesPrompt hasUnsavedChanges={true} />, '/workflow-123');

      const messageFunction = mockPromptMessage;
      expect(messageFunction).toBeDefined();

      // Test navigation outside workflows
      const result = messageFunction!({ pathname: '/app/dashboards' });
      expect(result).toBe('Your changes have not been saved. Are you sure you want to leave?');
    });

    it('should handle undefined nextLocation', () => {
      renderWithProviders(<UnsavedChangesPrompt hasUnsavedChanges={true} />, '/workflow-123');

      const messageFunction = mockPromptMessage;
      expect(messageFunction).toBeDefined();

      // Test with undefined nextLocation
      const result = messageFunction!(undefined);
      expect(result).toBe('Your changes have not been saved. Are you sure you want to leave?');
    });

    it('should handle nextLocation without pathname', () => {
      renderWithProviders(<UnsavedChangesPrompt hasUnsavedChanges={true} />, '/workflow-123');

      const messageFunction = mockPromptMessage;
      expect(messageFunction).toBeDefined();

      // Test with nextLocation without pathname
      const result = messageFunction!({});
      expect(result).toBe('Your changes have not been saved. Are you sure you want to leave?');
    });
  });

  describe('path tracking', () => {
    it('should update current path ref when location changes', () => {
      renderWithProviders(<UnsavedChangesPrompt hasUnsavedChanges={true} />, '/workflow-123');

      // Update the mock location
      mockLocation.pathname = '/workflow-456';

      // Re-render to trigger the useEffect
      renderWithProviders(<UnsavedChangesPrompt hasUnsavedChanges={true} />, '/workflow-456');

      const messageFunction = mockPromptMessage;
      expect(messageFunction).toBeDefined();

      // Should now allow navigation within the new workflow
      const result = messageFunction!({ pathname: '/app/workflows/workflow-456' });
      expect(result).toBe(true);
    });
  });
});
