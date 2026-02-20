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
import { useFocusedStepDecoration } from './use_focused_step_decoration';
import { createMockStore } from '../../../../entities/workflows/store/__mocks__/store.mock';
import {
  _setComputedDataInternal,
  setCursorPosition,
  setYamlString,
} from '../../../../entities/workflows/store/workflow_detail/slice';
import type { ComputedData } from '../../../../entities/workflows/store/workflow_detail/types';
import type { StepInfo } from '../../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';

jest.mock('@kbn/monaco', () => {
  const actualMonaco = jest.requireActual('@kbn/monaco');
  return {
    ...actualMonaco,
    monaco: {
      ...actualMonaco.monaco,
      Range: jest.fn((startLine: number, startCol: number, endLine: number, endCol: number) => ({
        startLineNumber: startLine,
        startColumn: startCol,
        endLineNumber: endLine,
        endColumn: endCol,
      })),
    },
  };
});

jest.mock('@elastic/eui', () => {
  const actualEui = jest.requireActual('@elastic/eui');
  return {
    ...actualEui,
    useEuiTheme: jest.fn(() => ({
      euiTheme: {
        colors: {
          vis: {
            euiColorVis2: '#00bfb3',
          },
        },
      },
    })),
    useEuiShadow: jest.fn(() => 'box-shadow: 0 1px 5px rgba(0,0,0,0.1);'),
    transparentize: jest.fn((color: string, opacity: number) => `${color}${opacity}`),
  };
});

jest.mock('@emotion/css', () => ({
  css: jest.fn(() => 'mock-block-class-name'),
}));

const createStepInfo = (overrides: Partial<StepInfo> = {}): StepInfo => ({
  stepId: 'step-1',
  stepType: 'action',
  stepYamlNode: {} as any,
  lineStart: 5,
  lineEnd: 10,
  propInfos: {},
  ...overrides,
});

const createMockEditor = () => {
  const decorationsCollection = {
    clear: jest.fn(),
    set: jest.fn(),
  };

  return {
    editor: {
      createDecorationsCollection: jest.fn(() => decorationsCollection),
    } as unknown as monaco.editor.IStandaloneCodeEditor,
    decorationsCollection,
  };
};

const renderHookWithProviders = (
  editor: monaco.editor.IStandaloneCodeEditor | null,
  stepInfos: Record<string, StepInfo> = {
    'step-1': createStepInfo({ stepId: 'step-1', lineStart: 5, lineEnd: 10 }),
  }
) => {
  const store = createMockStore();

  store.dispatch(setYamlString('version: "1"\nname: test'));

  const computedData: ComputedData = {
    workflowLookup: {
      steps: stepInfos,
    },
  };
  store.dispatch(_setComputedDataInternal(computedData));

  const wrapper = ({ children }: { children: React.ReactNode }) => {
    return React.createElement(Provider, { store }, children);
  };

  return {
    ...renderHook(() => useFocusedStepDecoration(editor), { wrapper }),
    store,
  };
};

describe('useFocusedStepDecoration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create exactly one block decoration spanning from lineStart to lineEnd', () => {
    const { editor, decorationsCollection } = createMockEditor();
    const { store } = renderHookWithProviders(editor);

    act(() => {
      store.dispatch(setCursorPosition({ lineNumber: 7, column: 1 }));
    });

    expect(decorationsCollection.set).toHaveBeenCalledTimes(1);

    const decorations = decorationsCollection.set.mock.calls[0][0];
    expect(decorations).toHaveLength(1);

    const [decoration] = decorations;
    expect(decoration.range).toEqual({
      startLineNumber: 5,
      startColumn: 1,
      endLineNumber: 10,
      endColumn: 1,
    });
    expect(decoration.options.blockClassName).toBe('mock-block-class-name');
    expect(decoration.options.isWholeLine).toBe(true);
  });

  it('should clear decorations on unmount', () => {
    const { editor, decorationsCollection } = createMockEditor();
    const { store, unmount } = renderHookWithProviders(editor);

    act(() => {
      store.dispatch(setCursorPosition({ lineNumber: 7, column: 1 }));
    });

    decorationsCollection.clear.mockClear();

    unmount();

    expect(decorationsCollection.clear).toHaveBeenCalled();
  });
});
