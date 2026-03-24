/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { configureStore, createAsyncThunk } from '@reduxjs/toolkit';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { useAsyncThunk, useAsyncThunkState } from './use_async_thunk';

const createTestStore = () =>
  configureStore({
    reducer: {
      stub: (state = {}) => state,
    },
  });

const createWrapper = (store: ReturnType<typeof createTestStore>) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(Provider, { store }, children);
  return Wrapper;
};

describe('useAsyncThunkState', () => {
  it('should return initial state', () => {
    const thunk = createAsyncThunk('test/action', async () => 'result');
    const store = createTestStore();

    const { result } = renderHook(() => useAsyncThunkState(thunk), {
      wrapper: createWrapper(store),
    });

    const [, state] = result.current;
    expect(state.result).toBeUndefined();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('should transition to loading state when started', async () => {
    let resolve: (value: string) => void;
    const promise = new Promise<string>((r) => {
      resolve = r;
    });
    const thunk = createAsyncThunk('test/loading', async () => promise);
    const store = createTestStore();

    const { result } = renderHook(() => useAsyncThunkState(thunk), {
      wrapper: createWrapper(store),
    });

    act(() => {
      result.current[0]();
    });

    await waitFor(() => {
      expect(result.current[1].isLoading).toBe(true);
    });

    expect(result.current[1].error).toBeNull();

    // Resolve the promise to avoid lingering state
    await act(async () => {
      resolve!('done');
    });
  });

  it('should transition to success state with result', async () => {
    const thunk = createAsyncThunk('test/success', async () => 'success-result');
    const store = createTestStore();

    const { result } = renderHook(() => useAsyncThunkState(thunk), {
      wrapper: createWrapper(store),
    });

    await act(async () => {
      await result.current[0]();
    });

    expect(result.current[1].result).toBe('success-result');
    expect(result.current[1].isLoading).toBe(false);
    expect(result.current[1].error).toBeNull();
  });

  it('should transition to error state on failure', async () => {
    const testError = new Error('thunk failed');
    const thunk = createAsyncThunk('test/error', async () => {
      throw testError;
    });
    const store = createTestStore();

    const { result } = renderHook(() => useAsyncThunkState(thunk), {
      wrapper: createWrapper(store),
    });

    await act(async () => {
      await result.current[0]();
    });

    expect(result.current[1].result).toBeUndefined();
    expect(result.current[1].isLoading).toBe(false);
    expect(result.current[1].error).toBeTruthy();
  });
});

describe('useAsyncThunk', () => {
  it('should return the result on success', async () => {
    const thunk = createAsyncThunk('test/promise-success', async () => 42);
    const store = createTestStore();

    const { result } = renderHook(() => useAsyncThunk(thunk), {
      wrapper: createWrapper(store),
    });

    let value: number | undefined;
    await act(async () => {
      value = await result.current();
    });

    expect(value).toBe(42);
  });

  it('should return undefined on failure', async () => {
    const thunk = createAsyncThunk('test/promise-error', async () => {
      throw new Error('failed');
    });
    const store = createTestStore();

    const { result } = renderHook(() => useAsyncThunk(thunk), {
      wrapper: createWrapper(store),
    });

    let value: unknown;
    await act(async () => {
      value = await result.current();
    });

    expect(value).toBeUndefined();
  });
});
