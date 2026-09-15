/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, render, waitFor } from '@testing-library/react';
import React from 'react';
import { createMemoryHistory } from 'history';
import { Router } from 'react-router-dom';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { createStartServicesMock } from '../../mocks';
import { UnsavedChangesPrompt } from './unsaved_changes_prompt';

describe('UnsavedChangesPrompt', () => {
  let addEventListenerSpy: jest.SpyInstance;
  let removeEventListenerSpy: jest.SpyInstance;
  let openConfirm: jest.Mock;
  let navigateToUrl: jest.Mock;
  let services: ReturnType<typeof createStartServicesMock>;

  const renderPrompt = (
    props: { hasUnsavedChanges: boolean; shouldPromptOnNavigation?: boolean },
    initialPath = '/workflow-123'
  ) => {
    const history = createMemoryHistory({ initialEntries: [initialPath] });
    const result = render(
      <KibanaContextProvider services={services}>
        <Router history={history}>
          <I18nProvider>
            <UnsavedChangesPrompt {...props} />
          </I18nProvider>
        </Router>
      </KibanaContextProvider>
    );
    return { history, ...result };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    services = createStartServicesMock();
    openConfirm = jest.fn().mockResolvedValue(false);
    navigateToUrl = jest.fn();
    services.overlays.openConfirm = openConfirm;
    services.application.navigateToUrl = navigateToUrl;
    jest.spyOn(services.http.basePath, 'prepend').mockImplementation((path: string) => path);
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  describe('beforeunload', () => {
    it('registers beforeunload only when dirty', () => {
      const { rerender, history } = renderPrompt({ hasUnsavedChanges: false });

      expect(addEventListenerSpy).not.toHaveBeenCalledWith('beforeunload', expect.any(Function));

      rerender(
        <KibanaContextProvider services={services}>
          <Router history={history}>
            <I18nProvider>
              <UnsavedChangesPrompt hasUnsavedChanges={true} />
            </I18nProvider>
          </Router>
        </KibanaContextProvider>
      );

      expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    });

    it('prevents default when dirty', () => {
      renderPrompt({ hasUnsavedChanges: true });

      const handler = addEventListenerSpy.mock.calls.find((call) => call[0] === 'beforeunload')?.[1];
      const mockEvent = { preventDefault: jest.fn(), returnValue: '' } as BeforeUnloadEvent;

      handler(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.returnValue).toBe('');
    });

    it('removes beforeunload on unmount', () => {
      const { unmount } = renderPrompt({ hasUnsavedChanges: true });
      unmount();
      expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    });
  });

  describe('SPA navigation confirm modal', () => {
    it('does not block when clean', async () => {
      const { history } = renderPrompt({ hasUnsavedChanges: false });

      act(() => {
        history.push('/workflow-456');
      });

      expect(history.location.pathname).toBe('/workflow-456');
      expect(openConfirm).not.toHaveBeenCalled();
    });

    it('does not block when shouldPromptOnNavigation is false', async () => {
      const { history } = renderPrompt({
        hasUnsavedChanges: true,
        shouldPromptOnNavigation: false,
      });

      act(() => {
        history.push('/workflow-456');
      });

      expect(history.location.pathname).toBe('/workflow-456');
      expect(openConfirm).not.toHaveBeenCalled();
    });

    it('allows navigation within the same workflow path', async () => {
      const { history } = renderPrompt({ hasUnsavedChanges: true }, '/workflow-123');

      act(() => {
        history.push({ pathname: '/app/workflows/workflow-123', search: '?tab=executions' });
      });

      await waitFor(() => {
        expect(openConfirm).not.toHaveBeenCalled();
      });
      expect(history.location.pathname).toBe('/app/workflows/workflow-123');
    });

    it('opens EuiConfirmModal copy with danger Discard and focus Keep editing', async () => {
      const { history } = renderPrompt({ hasUnsavedChanges: true }, '/workflow-123');

      act(() => {
        history.push('/workflow-456');
      });

      await waitFor(() => {
        expect(openConfirm).toHaveBeenCalledWith(
          "Your changes to this workflow haven't been saved. If you leave now, they'll be lost.",
          expect.objectContaining({
            title: 'Discard unsaved changes?',
            confirmButtonText: 'Discard changes',
            cancelButtonText: 'Keep editing',
            buttonColor: 'danger',
            defaultFocusedButton: 'cancel',
            maxWidth: 400,
            'data-test-subj': 'workflowUnsavedChangesConfirmModal',
          })
        );
      });
      expect(history.location.pathname).toBe('/workflow-123');
    });

    it('navigates away when Discard changes is confirmed', async () => {
      openConfirm.mockResolvedValue(true);
      const { history } = renderPrompt({ hasUnsavedChanges: true }, '/workflow-123');

      act(() => {
        history.push('/workflow-456');
      });

      await waitFor(() => {
        expect(navigateToUrl).toHaveBeenCalledWith('/workflow-456', { state: undefined });
      });
    });

    it('stays on the page when Keep editing is chosen', async () => {
      openConfirm.mockResolvedValue(false);
      const { history } = renderPrompt({ hasUnsavedChanges: true }, '/workflow-123');

      act(() => {
        history.push('/workflow-456');
      });

      await waitFor(() => {
        expect(openConfirm).toHaveBeenCalled();
      });
      expect(navigateToUrl).not.toHaveBeenCalled();
      expect(history.location.pathname).toBe('/workflow-123');
    });
  });
});
