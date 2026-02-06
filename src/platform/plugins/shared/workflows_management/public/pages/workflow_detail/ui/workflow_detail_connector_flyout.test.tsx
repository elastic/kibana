/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, render } from '@testing-library/react';
import React from 'react';
import { monaco } from '@kbn/monaco';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import { WorkflowDetailConnectorFlyout } from './workflow_detail_connector_flyout';
import {
  openCreateConnectorFlyout,
  openEditConnectorFlyout,
} from '../../../entities/workflows/store';
import { createMockStore } from '../../../entities/workflows/store/__mocks__/store.mock';
import { TestWrapper } from '../../../shared/test_utils';

// Mock hooks
const mockUseKibana = jest.fn();
const mockUseAsyncThunk = jest.fn();
const mockUseFetchConnector = jest.fn();

jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => mockUseKibana(),
}));

jest.mock('../../../hooks/use_async_thunk', () => ({
  useAsyncThunk: (thunk: any) => mockUseAsyncThunk(thunk),
}));

jest.mock('../../../entities/connectors/model/use_available_connectors', () => ({
  useFetchConnector: (connectorId?: string) => mockUseFetchConnector(connectorId),
}));

describe('WorkflowDetailConnectorFlyout', () => {
  const mockEditorRef = {
    current: null,
  } as React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
  const mockGetAddConnectorFlyout = jest.fn();
  const mockGetEditConnectorFlyout = jest.fn();
  const mockLoadConnectors = jest.fn();

  const mockConnector = {
    id: 'connector-123',
    name: 'Test Connector',
    actionTypeId: 'test-action-type',
    config: {},
    secrets: {},
    isPreconfigured: false,
    isDeprecated: false,
    isSystemAction: false,
    isConnectorTypeDeprecated: false,
  } as ActionConnector;

  const mockInsertPosition = {
    lineNumber: 5,
    column: 10,
  };

  const createMockEditor = (): monaco.editor.IStandaloneCodeEditor => {
    const mockModel = {
      getLineMaxColumn: jest.fn((lineNumber: number) => 50),
      pushEditOperations: jest.fn(),
    } as any;

    return {
      getModel: jest.fn(() => mockModel),
    } as any;
  };

  const renderComponent = (store = createMockStore()) => {
    const wrapper = ({ children }: { children: React.ReactNode }) => {
      return <TestWrapper store={store}>{children}</TestWrapper>;
    };
    return {
      ...render(<WorkflowDetailConnectorFlyout editorRef={mockEditorRef} />, { wrapper }),
      store,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockEditorRef.current = createMockEditor() as monaco.editor.IStandaloneCodeEditor;

    mockUseKibana.mockReturnValue({
      services: {
        triggersActionsUi: {
          getAddConnectorFlyout: mockGetAddConnectorFlyout,
          getEditConnectorFlyout: mockGetEditConnectorFlyout,
        },
      },
    });

    mockUseAsyncThunk.mockReturnValue(mockLoadConnectors);

    mockUseFetchConnector.mockReturnValue({
      data: undefined,
      isLoading: false,
    });

    mockGetAddConnectorFlyout.mockReturnValue(<div data-test-subj="add-connector-flyout" />);
    mockGetEditConnectorFlyout.mockReturnValue(<div data-test-subj="edit-connector-flyout" />);
  });

  describe('when flyout is closed', () => {
    it('should return null', () => {
      const { container } = renderComponent();
      expect(container.firstChild).toBeNull();
    });
  });

  describe('when connectorType is not set', () => {
    it('should return null even if flyout is open', () => {
      const { store, container } = renderComponent();
      act(() => {
        store.dispatch(
          openCreateConnectorFlyout({
            connectorType: undefined as any,
          })
        );
      });
      expect(container.firstChild).toBeNull();
    });
  });

  describe('when creating a new connector', () => {
    it('should open the add connector flyout', () => {
      const { store, getByTestId } = renderComponent();
      act(() => {
        store.dispatch(
          openCreateConnectorFlyout({
            connectorType: 'test-action-type',
            insertPosition: mockInsertPosition,
          })
        );
      });
      expect(getByTestId('add-connector-flyout')).toBeInTheDocument();
      expect(mockGetAddConnectorFlyout).toHaveBeenCalledWith({
        initialConnector: { actionTypeId: 'test-action-type' },
        onClose: expect.any(Function),
        onConnectorCreated: expect.any(Function),
      });
    });

    it('should call closeConnectorFlyout when onClose is triggered', () => {
      let onCloseCallback: (() => void) | undefined;
      mockGetAddConnectorFlyout.mockImplementation((config: any) => {
        onCloseCallback = config.onClose;
        return <div data-test-subj="add-connector-flyout" />;
      });

      const { store } = renderComponent();
      act(() => {
        store.dispatch(
          openCreateConnectorFlyout({
            connectorType: 'test-action-type',
          })
        );
      });

      expect(onCloseCallback).toBeDefined();
      act(() => {
        onCloseCallback!();
      });
      expect(store.getState().detail.connectorFlyout.isOpen).toBe(false);
    });

    it('should insert connector ID and reload connectors when onConnectorCreated is triggered', () => {
      let onConnectorCreatedCallback: ((connector: ActionConnector) => void) | undefined;
      mockGetAddConnectorFlyout.mockImplementation((config: any) => {
        onConnectorCreatedCallback = config.onConnectorCreated;
        return <div data-test-subj="add-connector-flyout" />;
      });

      const { store } = renderComponent();
      act(() => {
        store.dispatch(
          openCreateConnectorFlyout({
            connectorType: 'test-action-type',
            insertPosition: mockInsertPosition,
          })
        );
      });

      expect(onConnectorCreatedCallback).toBeDefined();
      act(() => {
        onConnectorCreatedCallback!(mockConnector);
      });

      expect(mockLoadConnectors).toHaveBeenCalled();
      expect(store.getState().detail.connectorFlyout.isOpen).toBe(false);

      // Verify editor insert operation
      const editorModel = mockEditorRef.current?.getModel();
      expect(editorModel?.pushEditOperations).toHaveBeenCalledWith(
        null,
        [
          {
            range: expect.any(monaco.Range),
            text: 'connector-123',
          },
        ],
        expect.any(Function)
      );
    });

    it('should not insert connector ID when insertPosition is not provided', () => {
      let onConnectorCreatedCallback: ((connector: ActionConnector) => void) | undefined;
      mockGetAddConnectorFlyout.mockImplementation((config: any) => {
        onConnectorCreatedCallback = config.onConnectorCreated;
        return <div data-test-subj="add-connector-flyout" />;
      });

      const { store } = renderComponent();
      act(() => {
        store.dispatch(
          openCreateConnectorFlyout({
            connectorType: 'test-action-type',
          })
        );
      });

      expect(onConnectorCreatedCallback).toBeDefined();
      act(() => {
        onConnectorCreatedCallback!(mockConnector);
      });

      expect(mockLoadConnectors).toHaveBeenCalled();
      expect(store.getState().detail.connectorFlyout.isOpen).toBe(false);

      // Verify editor insert operation was not called
      const editorModel = mockEditorRef.current?.getModel();
      expect(editorModel?.pushEditOperations).not.toHaveBeenCalled();
    });
  });

  describe('when editing an existing connector', () => {
    it('should wait for connector to load before opening edit flyout', () => {
      mockUseFetchConnector.mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      const { store, container } = renderComponent();
      act(() => {
        store.dispatch(
          openEditConnectorFlyout({
            connectorType: 'test-action-type',
            connectorIdToEdit: 'connector-123',
          })
        );
      });

      expect(container.firstChild).toBeNull();
      expect(mockGetEditConnectorFlyout).not.toHaveBeenCalled();
    });

    it('should open the edit connector flyout when connector is loaded', () => {
      mockUseFetchConnector.mockReturnValue({
        data: mockConnector,
        isLoading: false,
      });

      const { store, getByTestId } = renderComponent();
      act(() => {
        store.dispatch(
          openEditConnectorFlyout({
            connectorType: 'test-action-type',
            connectorIdToEdit: 'connector-123',
          })
        );
      });

      expect(getByTestId('edit-connector-flyout')).toBeInTheDocument();
      expect(mockGetEditConnectorFlyout).toHaveBeenCalledWith({
        connector: mockConnector,
        onClose: expect.any(Function),
        onConnectorUpdated: expect.any(Function),
      });
    });

    it('should call closeConnectorFlyout when onClose is triggered', () => {
      let onCloseCallback: (() => void) | undefined;
      mockGetEditConnectorFlyout.mockImplementation((config: any) => {
        onCloseCallback = config.onClose;
        return <div data-test-subj="edit-connector-flyout" />;
      });

      mockUseFetchConnector.mockReturnValue({
        data: mockConnector,
        isLoading: false,
      });

      const { store } = renderComponent();
      act(() => {
        store.dispatch(
          openEditConnectorFlyout({
            connectorType: 'test-action-type',
            connectorIdToEdit: 'connector-123',
          })
        );
      });

      expect(onCloseCallback).toBeDefined();
      act(() => {
        onCloseCallback!();
      });
      expect(store.getState().detail.connectorFlyout.isOpen).toBe(false);
    });

    it('should reload connectors and close flyout when onConnectorUpdated is triggered', () => {
      let onConnectorUpdatedCallback: (() => void) | undefined;
      mockGetEditConnectorFlyout.mockImplementation((config: any) => {
        onConnectorUpdatedCallback = config.onConnectorUpdated;
        return <div data-test-subj="edit-connector-flyout" />;
      });

      mockUseFetchConnector.mockReturnValue({
        data: mockConnector,
        isLoading: false,
      });

      const { store } = renderComponent();
      act(() => {
        store.dispatch(
          openEditConnectorFlyout({
            connectorType: 'test-action-type',
            connectorIdToEdit: 'connector-123',
          })
        );
      });

      expect(onConnectorUpdatedCallback).toBeDefined();
      act(() => {
        onConnectorUpdatedCallback!();
      });

      expect(mockLoadConnectors).toHaveBeenCalled();
      expect(store.getState().detail.connectorFlyout.isOpen).toBe(false);
    });
  });

  describe('insertConnectorId function', () => {
    it('should handle errors gracefully when editor model is unavailable', () => {
      mockEditorRef.current = null as any;

      let onConnectorCreatedCallback: ((connector: ActionConnector) => void) | undefined;
      mockGetAddConnectorFlyout.mockImplementation((config: any) => {
        onConnectorCreatedCallback = config.onConnectorCreated;
        return <div data-test-subj="add-connector-flyout" />;
      });

      const { store } = renderComponent();
      act(() => {
        store.dispatch(
          openCreateConnectorFlyout({
            connectorType: 'test-action-type',
            insertPosition: mockInsertPosition,
          })
        );
      });

      expect(onConnectorCreatedCallback).toBeDefined();
      // Should not throw error
      expect(() => {
        act(() => {
          onConnectorCreatedCallback!(mockConnector);
        });
      }).not.toThrow();
    });

    it('should handle errors gracefully when pushEditOperations fails', () => {
      const mockModel = {
        getLineMaxColumn: jest.fn(() => 50),
        pushEditOperations: jest.fn(() => {
          throw new Error('Edit operation failed');
        }),
      };
      mockEditorRef.current = {
        getModel: jest.fn(() => mockModel),
      } as any;

      let onConnectorCreatedCallback: ((connector: ActionConnector) => void) | undefined;
      mockGetAddConnectorFlyout.mockImplementation((config: any) => {
        onConnectorCreatedCallback = config.onConnectorCreated;
        return <div data-test-subj="add-connector-flyout" />;
      });

      const { store } = renderComponent();
      act(() => {
        store.dispatch(
          openCreateConnectorFlyout({
            connectorType: 'test-action-type',
            insertPosition: mockInsertPosition,
          })
        );
      });

      expect(onConnectorCreatedCallback).toBeDefined();
      // Should not throw error
      expect(() => {
        act(() => {
          onConnectorCreatedCallback!(mockConnector);
        });
      }).not.toThrow();
    });
  });
});
