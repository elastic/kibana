/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import type { ESQLCallbacks } from '@kbn/esql-types';
import type { monaco } from '@kbn/code-editor';
import type { UseQueryValidationParams } from './use_query_validation';
import { useQueryValidation, VALIDATION_DEBOUNCE_MS } from './use_query_validation';
import type { MapCache } from 'lodash';

const mockValidate = jest.fn().mockResolvedValue({ errors: [], warnings: [] });
const mockSetModelMarkers = jest.fn();

jest.mock('@kbn/code-editor', () => {
  const actual = jest.requireActual('@kbn/code-editor');
  return {
    ...actual,
    ESQLLang: {
      ...actual.ESQLLang,
      validate: (...args: unknown[]) => mockValidate(...args),
    },
    monaco: {
      ...actual.monaco,
      editor: {
        ...actual.monaco.editor,
        setModelMarkers: (...args: unknown[]) => mockSetModelMarkers(...args),
      },
    },
  };
});

interface ValidationRun {
  cancellationToken?: monaco.CancellationToken;
}

const createMockEditorModelRef = () => {
  const ref: React.MutableRefObject<Partial<monaco.editor.ITextModel> | undefined> = {
    current: {
      isDisposed: jest.fn().mockReturnValue(false),
    },
  };
  return ref as React.MutableRefObject<monaco.editor.ITextModel | undefined>;
};

const createMockEditorRef = () => {
  const ref: React.MutableRefObject<Partial<monaco.editor.IStandaloneCodeEditor> | undefined> = {
    current: {},
  };
  return ref as React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>;
};

const createMockCache = () => {
  return {
    clear: jest.fn(),
  } as unknown as MapCache;
};

const defaultParams = (
  overrides: Partial<UseQueryValidationParams> = {}
): UseQueryValidationParams => ({
  code: 'FROM logs',
  lastErroredCode: undefined,
  editorRef: createMockEditorRef(),
  editorModel: createMockEditorModelRef(),
  esqlCallbacks: {} as ESQLCallbacks,
  serverErrors: undefined,
  serverWarning: undefined,
  mergeExternalMessages: false,
  dataErrorsControl: undefined,
  isLoading: false,
  isQueryLoading: false,
  dataSourcesCache: createMockCache(),
  esqlFieldsCache: createMockCache(),
  getJoinIndicesCallback: jest.fn(),
  onQueryUpdate: jest.fn(),
  pickerProjectRouting: undefined,
  latencyTracking: {
    trackValidationLatencyStart: jest.fn(),
    trackValidationLatencyEnd: jest.fn(),
    resetValidationTracking: jest.fn(),
  },
  ...overrides,
});

const advanceDebounce = () => {
  act(() => {
    jest.advanceTimersByTime(VALIDATION_DEBOUNCE_MS);
  });
};

describe('useQueryValidation debounced validation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockValidate.mockResolvedValue({ errors: [], warnings: [] });
    window.performance.mark = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('runs client validation once after rapid code changes within the debounce window', async () => {
    const { rerender } = renderHook(
      (props: UseQueryValidationParams) => useQueryValidation(props),
      {
        initialProps: defaultParams({ code: 'FROM logs' }),
      }
    );

    advanceDebounce();
    await waitFor(() => expect(mockValidate).toHaveBeenCalledTimes(1));
    mockValidate.mockClear();

    rerender(defaultParams({ code: 'FROM logs |' }));
    rerender(defaultParams({ code: 'FROM logs | LIMIT' }));
    rerender(defaultParams({ code: 'FROM logs | LIMIT 10' }));

    advanceDebounce();

    await waitFor(() => expect(mockValidate).toHaveBeenCalledTimes(1));
    expect(mockValidate).toHaveBeenLastCalledWith(
      expect.anything(),
      'FROM logs | LIMIT 10',
      expect.anything(),
      expect.anything(),
      expect.anything()
    );
  });

  it('validates again when code is unchanged but other dependencies (I.E: serverErrors) changes', async () => {
    const { rerender } = renderHook(
      (props: UseQueryValidationParams) => useQueryValidation(props),
      {
        initialProps: defaultParams({ code: 'FROM logs' }),
      }
    );

    advanceDebounce();
    await waitFor(() => expect(mockValidate).toHaveBeenCalledTimes(1));
    mockValidate.mockClear();

    rerender(
      defaultParams({
        code: 'FROM logs',
        serverErrors: [new Error('server error')],
      })
    );

    advanceDebounce();

    expect(mockValidate).toHaveBeenCalledTimes(1);
  });

  it('skips client side validations and shows server errors when code matches lastErroredCode', async () => {
    const serverErrors = [new Error('boom')];

    renderHook(() =>
      useQueryValidation(
        defaultParams({
          code: 'FROM logs',
          lastErroredCode: 'FROM logs',
          serverErrors,
        })
      )
    );

    advanceDebounce();

    await waitFor(() => expect(mockSetModelMarkers).toHaveBeenCalled());
    expect(mockValidate).not.toHaveBeenCalled();
  });

  it('cancels an in-flight validation when code changes before it completes', async () => {
    const pendingValidations: ValidationRun[] = [];

    mockValidate.mockImplementation(
      (_model, _code, _callbacks, _options, cancellationToken?: monaco.CancellationToken) =>
        new Promise(() => {
          pendingValidations.push({
            cancellationToken,
          });
        })
    );

    const { rerender } = renderHook(
      (props: UseQueryValidationParams) => useQueryValidation(props),
      {
        initialProps: defaultParams({ code: 'FROM logs' }),
      }
    );

    advanceDebounce();
    await waitFor(() => expect(pendingValidations).toHaveLength(1));

    const firstToken = pendingValidations[0].cancellationToken;

    rerender(defaultParams({ code: 'FROM logs | LIMIT 10' }));
    advanceDebounce();

    await waitFor(() => expect(pendingValidations).toHaveLength(2));
    expect(firstToken?.isCancellationRequested).toBe(true);
  });
});
