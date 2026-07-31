/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { useNlGeneration } from './use_nl_generation';

jest.mock('../hooks/use_nl_to_esql_check', () => ({ useNlToEsqlCheck: () => false }));

describe('useNlGeneration', () => {
  const coreStart = coreMock.createStart();

  const createWrapper =
    () =>
    ({ children }: { children: React.ReactNode }) =>
      <KibanaContextProvider services={{ core: coreStart }}>{children}</KibanaContextProvider>;

  const defaultParams = {
    query: 'FROM test_index',
    onUpdateAndSubmitQuery: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('onNlSubmit does nothing when nlValue is empty', async () => {
    const { result } = renderHook(() => useNlGeneration(defaultParams), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.onNlSubmit();
    });

    expect(coreStart.http.post).not.toHaveBeenCalled();
  });

  it('onNlSubmit calls onNlResult with the generated content when provided', async () => {
    const onNlResult = jest.fn();
    (coreStart.http.post as jest.Mock).mockResolvedValue({ content: 'FROM logs | LIMIT 10' });

    const { result } = renderHook(() => useNlGeneration({ ...defaultParams, onNlResult }), {
      wrapper: createWrapper(),
    });

    act(() => result.current.setNlValue('show me logs'));
    await act(async () => {
      await result.current.onNlSubmit();
    });

    expect(onNlResult).toHaveBeenCalledWith('FROM logs | LIMIT 10');
    expect(defaultParams.onUpdateAndSubmitQuery).not.toHaveBeenCalled();
  });

  it('onNlSubmit falls back to onUpdateAndSubmitQuery when onNlResult is not provided', async () => {
    (coreStart.http.post as jest.Mock).mockResolvedValue({ content: 'FROM logs | LIMIT 10' });

    const { result } = renderHook(() => useNlGeneration(defaultParams), {
      wrapper: createWrapper(),
    });

    act(() => result.current.setNlValue('show me logs'));
    await act(async () => {
      await result.current.onNlSubmit();
    });

    expect(defaultParams.onUpdateAndSubmitQuery).toHaveBeenCalledWith('FROM logs | LIMIT 10');
  });

  it('onNlSubmit shows the server error message on failure', async () => {
    (coreStart.http.post as jest.Mock).mockRejectedValue({
      body: { message: 'Connector unavailable', statusCode: 503 },
    });

    const { result } = renderHook(() => useNlGeneration(defaultParams), {
      wrapper: createWrapper(),
    });

    act(() => result.current.setNlValue('show me logs'));
    await act(async () => {
      await result.current.onNlSubmit();
    });

    expect(coreStart.notifications.toasts.addDanger).toHaveBeenCalledWith({
      title: 'Connector unavailable',
    });
  });

  it('onNlSubmit shows the fallback message when the error has no body message', async () => {
    (coreStart.http.post as jest.Mock).mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => useNlGeneration(defaultParams), {
      wrapper: createWrapper(),
    });

    act(() => result.current.setNlValue('show me logs'));
    await act(async () => {
      await result.current.onNlSubmit();
    });

    expect(coreStart.notifications.toasts.addDanger).toHaveBeenCalledWith({
      title: 'Failed to generate ES|QL query',
    });
  });

  it('onStopGeneration aborts the request, clears loading state and nlValue', async () => {
    (coreStart.http.post as jest.Mock).mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useNlGeneration(defaultParams), {
      wrapper: createWrapper(),
    });

    act(() => result.current.setNlValue('show me logs'));
    act(() => {
      result.current.onNlSubmit();
    });

    expect(result.current.isNlLoading).toBe(true);

    act(() => result.current.onStopGeneration());

    expect(result.current.isNlLoading).toBe(false);
    expect(result.current.nlValue).toBe('');
  });
});
