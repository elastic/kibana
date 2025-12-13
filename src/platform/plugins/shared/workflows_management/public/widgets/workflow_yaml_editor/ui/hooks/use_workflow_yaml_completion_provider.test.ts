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
import { monaco, YAML_LANG_ID } from '@kbn/monaco';
import { useWorkflowYamlCompletionProvider } from './use_workflow_yaml_completion_provider';
import { createMockStore } from '../../../../entities/workflows/store/__mocks__/store.mock';
import {
  _setComputedDataInternal,
  setActiveTab,
  setYamlString,
} from '../../../../entities/workflows/store/workflow_detail/slice';
import type { ComputedData } from '../../../../entities/workflows/store/workflow_detail/types';
import { getCompletionItemProvider } from '../../lib/autocomplete/get_completion_item_provider';

// Mock the completion provider
const mockCompletionProvider = {
  triggerCharacters: ['@', '.', ' ', '|', '{'],
  provideCompletionItems: jest.fn(),
};

jest.mock('../../lib/autocomplete/get_completion_item_provider', () => ({
  getCompletionItemProvider: jest.fn(() => mockCompletionProvider),
}));

// Mock Monaco
jest.mock('@kbn/monaco', () => {
  const mockDisposableValue = {
    dispose: jest.fn(),
  };
  const mockRegisterCompletionItemProvider = jest.fn().mockReturnValue(mockDisposableValue);
  return {
    monaco: {
      languages: {
        registerCompletionItemProvider: mockRegisterCompletionItemProvider,
      },
    },
    YAML_LANG_ID: 'yaml',
  };
});

// Helper function to create a mock editor
const createMockEditor = (): monaco.editor.IStandaloneCodeEditor => {
  return {
    getModel: jest.fn(),
    dispose: jest.fn(),
  } as unknown as monaco.editor.IStandaloneCodeEditor;
};

// Helper function to create mock computed data
const createMockComputedData = (overrides: Partial<ComputedData> = {}): ComputedData => ({
  yamlDocument: undefined,
  yamlLineCounter: undefined,
  workflowLookup: undefined,
  workflowGraph: undefined,
  workflowDefinition: undefined,
  ...overrides,
});

// Helper to render hook with Redux provider
const renderHookWithProviders = (
  editor: monaco.editor.IStandaloneCodeEditor | null,
  initialComputed?: ComputedData
) => {
  const store = createMockStore();

  // Set initial YAML
  store.dispatch(setYamlString('version: "1"\nname: test'));
  store.dispatch(setActiveTab('workflow'));

  // Set computed data if provided
  if (initialComputed) {
    store.dispatch(_setComputedDataInternal(initialComputed));
  }

  const wrapper = ({ children }: { children: React.ReactNode }) => {
    return React.createElement(Provider, { store }, children);
  };

  return {
    ...renderHook(
      (currentEditor: monaco.editor.IStandaloneCodeEditor | null) =>
        useWorkflowYamlCompletionProvider(currentEditor),
      {
        wrapper,
        initialProps: editor,
      }
    ),
    store,
  };
};

describe('useWorkflowYamlCompletionProvider', () => {
  // Get the mock disposable from a specific call index
  const getMockDisposable = (callIndex: number = 0) => {
    const results = (monaco.languages.registerCompletionItemProvider as jest.Mock).mock.results;
    if (results.length === 0) return null;
    return results[callIndex]?.value ?? null;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should register completion provider when editor and computed are provided', () => {
    const editor = createMockEditor();
    const computed = createMockComputedData();
    renderHookWithProviders(editor, computed);

    expect(getCompletionItemProvider).toHaveBeenCalledTimes(1);
    expect(monaco.languages.registerCompletionItemProvider).toHaveBeenCalledWith(
      YAML_LANG_ID,
      mockCompletionProvider
    );
  });

  it('should pass a function to getCompletionItemProvider that returns current state', () => {
    const editor = createMockEditor();
    const computed = createMockComputedData();
    const { store } = renderHookWithProviders(editor, computed);

    const getStateFn = (getCompletionItemProvider as jest.Mock).mock.calls[0][0];
    const state = getStateFn();

    expect(state).toEqual(store.getState().detail);
  });

  it('should use latest state via ref when provider is called', () => {
    const editor = createMockEditor();
    const computed = createMockComputedData();
    const { store } = renderHookWithProviders(editor, computed);

    const getStateFn = (getCompletionItemProvider as jest.Mock).mock.calls[0][0];

    act(() => {
      store.dispatch(setYamlString('version: "1"\nname: updated'));
    });

    const currentState = getStateFn();
    expect(currentState.yamlString).toBe('version: "1"\nname: updated');
  });

  it('should dispose completion provider when component unmounts', () => {
    const editor = createMockEditor();
    const computed = createMockComputedData();
    const { unmount } = renderHookWithProviders(editor, computed);

    expect(monaco.languages.registerCompletionItemProvider).toHaveBeenCalledTimes(1);
    const disposable = getMockDisposable(0);
    expect(disposable?.dispose).not.toHaveBeenCalled();

    unmount();

    expect(disposable?.dispose).toHaveBeenCalledTimes(1);
  });
});
