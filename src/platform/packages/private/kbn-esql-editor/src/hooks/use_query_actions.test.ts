/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import { renderHook, act } from '@testing-library/react';
import { QuerySource } from '@kbn/esql-types';
import type { monaco } from '@kbn/code-editor';
import { useQueryActions } from './use_query_actions';
import type { ESQLEditorTelemetryService } from '../telemetry/telemetry_service';
import type { ESQLEditorProps } from '../types';

const createMockEditorRef = (value = 'FROM logs') => {
  const ref: React.MutableRefObject<Partial<monaco.editor.IStandaloneCodeEditor> | undefined> = {
    current: {
      getValue: vi.fn().mockReturnValue(value),
      getSelection: vi.fn().mockReturnValue(null),
      getLayoutInfo: vi.fn().mockReturnValue({ contentWidth: 800 }),
      getOption: vi.fn().mockReturnValue({ typicalHalfwidthCharacterWidth: 8 }),
      executeEdits: vi.fn(),
    },
  };
  return ref as React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>;
};

const createMockEditorModelRef = () => {
  const ref: React.MutableRefObject<Partial<monaco.editor.ITextModel> | undefined> = {
    current: {
      getLineContent: vi.fn().mockReturnValue(''),
    },
  };
  return ref as React.MutableRefObject<monaco.editor.ITextModel | undefined>;
};

const createMockTelemetryService = () =>
  ({
    trackQuerySubmitted: vi.fn(),
    trackQueryHistoryClicked: vi.fn(),
  } as unknown as ESQLEditorTelemetryService);

const defaultParams = () => ({
  editorRef: createMockEditorRef(),
  editorModel: createMockEditorModelRef(),
  isLoading: false,
  allowQueryCancellation: false,
  measuredEditorWidth: 800,
  onTextLangQuerySubmit: vi
    .fn()
    .mockResolvedValue(undefined) as unknown as ESQLEditorProps['onTextLangQuerySubmit'],
  onQueryUpdate: vi.fn(),
  telemetryService: createMockTelemetryService(),
});

describe('useQueryActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns all expected properties', () => {
    const { result } = renderHook(() => useQueryActions(defaultParams()));

    expect(result.current).toHaveProperty('onQuerySubmit');
    expect(result.current).toHaveProperty('onUpdateAndSubmitQuery');
    expect(result.current).toHaveProperty('onPrettifyQuery');
    expect(result.current).toHaveProperty('onCommentLine');
    expect(result.current).toHaveProperty('queryRunButtonProperties');
    expect(result.current).toHaveProperty('isQueryLoading');
  });

  describe('onQuerySubmit', () => {
    it('submits the query and tracks telemetry', () => {
      const params = defaultParams();
      const { result } = renderHook(() => useQueryActions(params));

      act(() => {
        result.current.onQuerySubmit(QuerySource.MANUAL);
      });

      expect(params.telemetryService.trackQuerySubmitted).toHaveBeenCalledWith({
        source: QuerySource.MANUAL,
        query: 'FROM logs',
      });
      expect(params.onTextLangQuerySubmit).toHaveBeenCalledWith(
        { esql: 'FROM logs' },
        expect.any(AbortController)
      );
    });

    it('does not track telemetry when editor value is empty', () => {
      const params = defaultParams();
      params.editorRef = createMockEditorRef('');
      const { result } = renderHook(() => useQueryActions(params));

      act(() => {
        result.current.onQuerySubmit(QuerySource.MANUAL);
      });

      expect(params.telemetryService.trackQuerySubmitted).not.toHaveBeenCalled();
      expect(params.onTextLangQuerySubmit).toHaveBeenCalled();
    });

    it('aborts when query is loading and cancellation is allowed', () => {
      const params = defaultParams();
      params.isLoading = true;
      params.allowQueryCancellation = true;
      const { result } = renderHook(() => useQueryActions(params));

      // isQueryLoading starts true, isLoading is true, allowQueryCancellation is true
      act(() => {
        result.current.onQuerySubmit(QuerySource.MANUAL);
      });

      // Should have cancelled, not submitted
      expect(params.onTextLangQuerySubmit).not.toHaveBeenCalled();
      expect(result.current.isQueryLoading).toBe(false);
    });
  });

  describe('onUpdateAndSubmitQuery', () => {
    it('updates query then submits', () => {
      vi.useFakeTimers();
      const params = defaultParams();
      const { result } = renderHook(() => useQueryActions(params));

      act(() => {
        result.current.onUpdateAndSubmitQuery('FROM new_index', QuerySource.HISTORY);
      });

      expect(params.onQueryUpdate).toHaveBeenCalledWith('FROM new_index');
      expect(params.telemetryService.trackQueryHistoryClicked).toHaveBeenCalledWith(false);

      act(() => {
        vi.runAllTimers();
      });

      expect(params.onTextLangQuerySubmit).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('tracks starred query source', () => {
      vi.useFakeTimers();
      const params = defaultParams();
      const { result } = renderHook(() => useQueryActions(params));

      act(() => {
        result.current.onUpdateAndSubmitQuery('FROM starred', QuerySource.STARRED);
      });

      expect(params.telemetryService.trackQueryHistoryClicked).toHaveBeenCalledWith(true);
      vi.useRealTimers();
    });
  });

  describe('queryRunButtonProperties', () => {
    it('shows Search label by default', () => {
      const { result } = renderHook(() => useQueryActions(defaultParams()));
      expect(result.current.queryRunButtonProperties.label).toBe('Search');
      expect(result.current.queryRunButtonProperties.color).toBe('primary');
    });

    it('shows Cancel label when loading with cancellation enabled', () => {
      const params = defaultParams();
      params.isLoading = true;
      params.allowQueryCancellation = true;
      const { result } = renderHook(() => useQueryActions(params));

      expect(result.current.queryRunButtonProperties.label).toBe('Cancel');
      expect(result.current.queryRunButtonProperties.color).toBe('text');
    });
  });

  describe('isQueryLoading', () => {
    it('resets to false when isLoading becomes false', () => {
      const params = defaultParams();
      params.isLoading = true;
      const { result, rerender } = renderHook((p) => useQueryActions(p), {
        initialProps: params,
      });

      expect(result.current.isQueryLoading).toBe(true);

      rerender({ ...params, isLoading: false });

      expect(result.current.isQueryLoading).toBe(false);
    });
  });
});
