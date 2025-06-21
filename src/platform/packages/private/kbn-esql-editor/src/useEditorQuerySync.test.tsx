/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { renderHook, act } from '@testing-library/react';
import { useEditorQuerySync, UseEditorQuerySyncArgs } from './useEditorQuerySync';

describe('useEditorQuerySync', () => {
  // Default props to be used across tests
  const defaultProps: UseEditorQuerySyncArgs = {
    isLoading: false,
    initialQueryEsql: 'FROM test',
    editorIsInline: false,
    isEditorMounted: true,
    allowQueryCancellation: false,
    onTextLangQuerySubmit: jest.fn(),
    currentAbortController: new AbortController(),
    setNewAbortController: jest.fn(),
    onTextLangQueryChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with the provided initialQueryEsql', () => {
    const { result } = renderHook(() => useEditorQuerySync(defaultProps));

    expect(result.current.code).toBe('FROM test');
    expect(result.current.codeWhenSubmitted).toBe('FROM test');
    expect(result.current.isQueryLoading).toBe(false);
  });

  it('should update isQueryLoading when isLoading changes', () => {
    const { result, rerender } = renderHook((props) => useEditorQuerySync(props), {
      initialProps: { ...defaultProps, isLoading: false },
    });

    // Simulate a loading change
    rerender({ ...defaultProps, isLoading: true });

    expect(result.current.isQueryLoading).toBe(true);

    // Simulate a loading change back to false
    rerender({ ...defaultProps, isLoading: false });

    expect(result.current.isQueryLoading).toBe(false);
  });

  it('should handle code updates via handleQueryUpdate', () => {
    const onTextLangQueryChange = jest.fn();

    const { result } = renderHook(() =>
      useEditorQuerySync({
        ...defaultProps,
        onTextLangQueryChange,
      })
    );

    // Act: update the code
    act(() => {
      result.current.handleQueryUpdate('FROM new_table');
    });

    // Assert: code should be updated
    expect(result.current.code).toBe('FROM new_table');

    // Assert: onTextLangQueryChange should be called since editorIsInline is false
    expect(onTextLangQueryChange).toHaveBeenCalledWith({ esql: 'FROM new_table' });
  });

  it('should not change code but trigger onTextLangQueryChange when editorIsInline is true', () => {
    const onTextLangQueryChange = jest.fn();

    const { result } = renderHook(() =>
      useEditorQuerySync({
        ...defaultProps,
        editorIsInline: true,
        onTextLangQueryChange,
      })
    );

    act(() => {
      result.current.handleQueryUpdate('FROM new_table');
    });
    expect(result.current.code).toBe('FROM test'); // Should not change the code in inline mode

    // Assert: onTextLangQueryChange should not be called when editorIsInline is true
    expect(onTextLangQueryChange).toHaveBeenCalled();
  });

  it('should handle query submission when not loading', () => {
    const onTextLangQuerySubmit = jest.fn();
    const abortController = new AbortController();

    const { result } = renderHook(() =>
      useEditorQuerySync({
        ...defaultProps,
        isLoading: false,
        onTextLangQuerySubmit,
        currentAbortController: abortController,
      })
    );

    // Act: submit the query
    act(() => {
      result.current.handleQuerySubmit();
    });

    // Assert: onTextLangQuerySubmit should be called with the current code
    expect(onTextLangQuerySubmit).toHaveBeenCalledWith({ esql: 'FROM test' }, abortController);

    // Assert: codeWhenSubmitted should be updated to the current code
    expect(result.current.codeWhenSubmitted).toBe('FROM test');

    // Assert: isQueryLoading should be set to true after submission
    expect(result.current.isQueryLoading).toBe(true);
  });

  it('should handle query cancellation when loading and allowQueryCancellation is true', () => {
    const onTextLangQuerySubmit = jest.fn();
    const abortController = new AbortController();
    const abortSpy = jest.spyOn(abortController, 'abort');

    const { result } = renderHook(() =>
      useEditorQuerySync({
        ...defaultProps,
        isLoading: true,
        allowQueryCancellation: true,
        onTextLangQuerySubmit,
        currentAbortController: abortController,
      })
    );

    // Act: submit the query (which should trigger cancellation)
    act(() => {
      result.current.handleQuerySubmit();
    });

    // Assert: the current abort controller should be aborted
    expect(abortSpy).toHaveBeenCalled();
  });

  it('should not overwrite editor content when loading state changes, but should overwrite on subsequent query changes', () => {
    const abortController = new AbortController();
    const onTextLangQuerySubmit = jest.fn();
    const { result, rerender } = renderHook((props) => useEditorQuerySync(props), {
      initialProps: {
        ...defaultProps,
        initialQueryEsql: 'FROM test | LIMIT 10',
        isLoading: true,
        editorIsInline: false,
        isEditorMounted: true,
        currentAbortController: abortController,
        onTextLangQuerySubmit,
      },
    });

    // Simulate user typing in the editor
    act(() => {
      result.current.handleQueryUpdate('FROM test | LIMIT 100');
    });
    expect(result.current.code).toBe('FROM test | LIMIT 100');

    // Simulate loading finishes and query prop changes
    rerender({
      ...defaultProps,
      isLoading: false,
      initialQueryEsql: 'FROM test | LIMIT 10',
      isEditorMounted: true,
      onTextLangQuerySubmit,
    });
    // The code should still show the user change, not the new query
    expect(result.current.code).toBe('FROM test | LIMIT 100');

    // Now, simulate another query prop change (should overwrite)
    rerender({
      ...defaultProps,
      isLoading: false,
      initialQueryEsql: 'FROM test | LIMIT 10',
      isEditorMounted: true,
      onTextLangQuerySubmit,
    });
    // The code should now be overwritten by the new query
    act(() => {
      result.current.handleQueryUpdate('FROM test | LIMIT 10');
    });
    expect(result.current.code).toBe('FROM test | LIMIT 10');

    // Now, simulate another query prop change (should overwrite)
    rerender({
      ...defaultProps,
      isLoading: false,
      initialQueryEsql: 'FROM test | LIMIT 1000',
      isEditorMounted: true,
      onTextLangQuerySubmit,
    });

    expect(result.current.code).toBe('FROM test | LIMIT 1000');

    act(() => {
      result.current.handleQuerySubmit();
    });

    // Assert: onTextLangQuerySubmit should be called with the current code
    expect(onTextLangQuerySubmit).toHaveBeenCalledWith(
      { esql: 'FROM test | LIMIT 1000' },
      abortController
    );
  });
  it('should  overwrite editor when external query changes during loading', () => {
    const abortController = new AbortController();
    const onTextLangQuerySubmit = jest.fn();
    const { result, rerender } = renderHook((props) => useEditorQuerySync(props), {
      initialProps: {
        ...defaultProps,
        initialQueryEsql: 'FROM test | LIMIT 1',
        isLoading: true,
        editorIsInline: false,
        isEditorMounted: true,
        currentAbortController: abortController,
        onTextLangQuerySubmit,
      },
    });

    act(() => {
      result.current.handleQueryUpdate('FROM test | LIMIT 10');
    });

    expect(result.current.code).toBe('FROM test | LIMIT 10');

    rerender({
      ...defaultProps,
      isLoading: true,
      initialQueryEsql: 'FROM test | LIMIT 10',
      isEditorMounted: true,
      onTextLangQuerySubmit,
    });
    expect(result.current.code).toBe('FROM test | LIMIT 10');

    rerender({
      ...defaultProps,
      isLoading: true,
      initialQueryEsql: 'FROM test | LIMIT 1000',
      isEditorMounted: true,
      onTextLangQuerySubmit,
    });
    expect(result.current.code).toBe('FROM test | LIMIT 1000');
  });
});
