/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import type { monaco } from '@kbn/monaco';
import { useMonacoHoverClickInterceptor } from './use_monaco_hover_click_interceptor';
import {
  openCreateConnectorFlyout,
  openEditConnectorFlyout,
} from '../../../../entities/workflows/store';
import { createMockStore } from '../../../../entities/workflows/store/__mocks__/store.mock';

describe('useMonacoHoverClickInterceptor', () => {
  let mockEditor: monaco.editor.IStandaloneCodeEditor;
  let mockDispatch: jest.Mock;
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock Monaco editor
    mockEditor = {
      getContainerDomNode: jest.fn(() => document.createElement('div')),
    } as any;

    // Create mock store
    store = createMockStore();
    mockDispatch = jest.fn();
    store.dispatch = mockDispatch;
  });

  afterEach(() => {
    // Clean up any event listeners
    const clickListeners = (document as any).__clickListeners || [];
    clickListeners.forEach((listener: any) => {
      document.removeEventListener('click', listener, true);
    });
    (document as any).__clickListeners = [];
  });

  const renderHookWithProviders = (editor: monaco.editor.IStandaloneCodeEditor | null) => {
    const wrapper = ({ children }: { children: React.ReactNode }) => {
      return React.createElement(Provider, { store }, children);
    };

    return renderHook(() => useMonacoHoverClickInterceptor(editor), { wrapper });
  };

  const createHoverContainer = (): HTMLElement => {
    const container = document.createElement('div');
    container.className = 'monaco-hover';
    document.body.appendChild(container);
    return container;
  };

  const createActionLink = (
    action: string,
    connectorType: string,
    connectorId?: string
  ): HTMLAnchorElement => {
    const link = document.createElement('a');
    link.href = '#';
    link.setAttribute('data-workflow-action', action);
    link.setAttribute('data-connector-type', encodeURIComponent(connectorType));
    if (connectorId) {
      link.setAttribute('data-connector-id', encodeURIComponent(connectorId));
    }
    return link;
  };

  describe('when editor is null', () => {
    it('should not attach event listeners', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

      act(() => {
        renderHookWithProviders(null);
      });

      // Filter out any calls that aren't for 'click' events to avoid false positives
      // The effect should have run, but since editor is null, it should return early
      // and not call addEventListener for 'click' events
      const clickListenerCalls = addEventListenerSpy.mock.calls.filter(
        (call) => call[0] === 'click'
      );
      expect(clickListenerCalls).toHaveLength(0);

      addEventListenerSpy.mockRestore();
    });
  });

  describe('when editor is provided', () => {
    it('should attach click event listener to document', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
      renderHookWithProviders(mockEditor);

      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), true);
      addEventListenerSpy.mockRestore();
    });

    it('should clean up event listener on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
      const { unmount } = renderHookWithProviders(mockEditor);

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), true);
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('click handling', () => {
    it('should ignore clicks outside Monaco hover widgets', () => {
      renderHookWithProviders(mockEditor);

      const link = createActionLink('open-connector-flyout', '.webhook');
      document.body.appendChild(link);

      act(() => {
        link.click();
      });

      expect(mockDispatch).not.toHaveBeenCalled();
      document.body.removeChild(link);
    });

    it('should ignore clicks inside hover widget without action attribute', () => {
      renderHookWithProviders(mockEditor);

      const hoverContainer = createHoverContainer();
      const link = document.createElement('a');
      link.href = '#';
      hoverContainer.appendChild(link);

      act(() => {
        link.click();
      });

      expect(mockDispatch).not.toHaveBeenCalled();
      document.body.removeChild(hoverContainer);
    });

    it('should dispatch openCreateConnectorFlyout when clicking create connector link', () => {
      renderHookWithProviders(mockEditor);

      const hoverContainer = createHoverContainer();
      const link = createActionLink('open-connector-flyout', '.webhook');
      hoverContainer.appendChild(link);

      const preventDefaultSpy = jest.fn();
      const stopPropagationSpy = jest.fn();

      act(() => {
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
        });
        Object.defineProperty(clickEvent, 'preventDefault', { value: preventDefaultSpy });
        Object.defineProperty(clickEvent, 'stopPropagation', { value: stopPropagationSpy });
        link.dispatchEvent(clickEvent);
      });

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(stopPropagationSpy).toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith(
        openCreateConnectorFlyout({ connectorType: '.webhook' })
      );

      document.body.removeChild(hoverContainer);
    });

    it('should decode URI component for connector type', () => {
      renderHookWithProviders(mockEditor);

      const hoverContainer = createHoverContainer();
      const encodedType = encodeURIComponent('.slack');
      const link = createActionLink('open-connector-flyout', '.slack');
      link.setAttribute('data-connector-type', encodedType);
      hoverContainer.appendChild(link);

      act(() => {
        link.click();
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        openCreateConnectorFlyout({ connectorType: '.slack' })
      );

      document.body.removeChild(hoverContainer);
    });

    it('should dispatch openEditConnectorFlyout when clicking edit connector link', () => {
      renderHookWithProviders(mockEditor);

      const hoverContainer = createHoverContainer();
      const link = createActionLink('open-connector-edit-flyout', '.webhook', 'connector-123');
      hoverContainer.appendChild(link);

      act(() => {
        link.click();
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        openEditConnectorFlyout({
          connectorType: '.webhook',
          connectorIdToEdit: 'connector-123',
        })
      );

      document.body.removeChild(hoverContainer);
    });

    it('should decode URI components for edit connector action', () => {
      renderHookWithProviders(mockEditor);

      const hoverContainer = createHoverContainer();
      const link = createActionLink('open-connector-edit-flyout', '.slack', 'connector-456');
      link.setAttribute('data-connector-type', encodeURIComponent('.slack'));
      link.setAttribute('data-connector-id', encodeURIComponent('connector-456'));
      hoverContainer.appendChild(link);

      act(() => {
        link.click();
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        openEditConnectorFlyout({
          connectorType: '.slack',
          connectorIdToEdit: 'connector-456',
        })
      );

      document.body.removeChild(hoverContainer);
    });

    it('should not dispatch edit action if connectorId is missing', () => {
      renderHookWithProviders(mockEditor);

      const hoverContainer = createHoverContainer();
      const link = createActionLink('open-connector-edit-flyout', '.webhook');
      // Intentionally not setting connector-id
      hoverContainer.appendChild(link);

      act(() => {
        link.click();
      });

      expect(mockDispatch).not.toHaveBeenCalled();
      document.body.removeChild(hoverContainer);
    });

    it('should not dispatch create action if connectorType is missing', () => {
      renderHookWithProviders(mockEditor);

      const hoverContainer = createHoverContainer();
      const link = document.createElement('a');
      link.href = '#';
      link.setAttribute('data-workflow-action', 'open-connector-flyout');
      // Intentionally not setting connector-type
      hoverContainer.appendChild(link);

      act(() => {
        link.click();
      });

      expect(mockDispatch).not.toHaveBeenCalled();
      document.body.removeChild(hoverContainer);
    });

    it('should handle clicks on nested elements within action link', () => {
      renderHookWithProviders(mockEditor);

      const hoverContainer = createHoverContainer();
      const link = createActionLink('open-connector-flyout', '.webhook');
      const span = document.createElement('span');
      span.textContent = 'Click me';
      link.appendChild(span);
      hoverContainer.appendChild(link);

      act(() => {
        span.click();
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        openCreateConnectorFlyout({ connectorType: '.webhook' })
      );

      document.body.removeChild(hoverContainer);
    });

    it('should handle clicks on nested elements within hover container', () => {
      renderHookWithProviders(mockEditor);

      const hoverContainer = createHoverContainer();
      const link = createActionLink('open-connector-flyout', '.webhook');
      hoverContainer.appendChild(link);
      const wrapper = document.createElement('div');
      wrapper.appendChild(hoverContainer);
      document.body.appendChild(wrapper);

      act(() => {
        link.click();
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        openCreateConnectorFlyout({ connectorType: '.webhook' })
      );

      document.body.removeChild(wrapper);
    });

    it('should work with monaco-editor-hover class as well', () => {
      renderHookWithProviders(mockEditor);

      const hoverContainer = document.createElement('div');
      hoverContainer.className = 'monaco-editor-hover';
      document.body.appendChild(hoverContainer);
      const link = createActionLink('open-connector-flyout', '.webhook');
      hoverContainer.appendChild(link);

      act(() => {
        link.click();
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        openCreateConnectorFlyout({ connectorType: '.webhook' })
      );

      document.body.removeChild(hoverContainer);
    });

    it('should handle multiple hover containers independently', () => {
      renderHookWithProviders(mockEditor);

      const hoverContainer1 = createHoverContainer();
      const link1 = createActionLink('open-connector-flyout', '.webhook');
      hoverContainer1.appendChild(link1);

      const hoverContainer2 = createHoverContainer();
      const link2 = createActionLink('open-connector-flyout', '.slack');
      hoverContainer2.appendChild(link2);

      act(() => {
        link1.click();
      });

      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith(
        openCreateConnectorFlyout({ connectorType: '.webhook' })
      );

      mockDispatch.mockClear();

      act(() => {
        link2.click();
      });

      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith(
        openCreateConnectorFlyout({ connectorType: '.slack' })
      );

      document.body.removeChild(hoverContainer1);
      document.body.removeChild(hoverContainer2);
    });
  });
});
