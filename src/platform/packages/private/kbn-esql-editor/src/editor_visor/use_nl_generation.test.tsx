/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { clearInferenceConnectorCache, useNlGeneration } from './use_nl_generation';
import { useNlToEsqlCheck } from '../hooks/use_nl_to_esql_check';

jest.mock('../hooks/use_nl_to_esql_check', () => ({
  useNlToEsqlCheck: jest.fn().mockReturnValue(false),
}));

describe('useNlGeneration', () => {
  const coreStart = coreMock.createStart();
  const esqlService = { hasInferenceConnector: jest.fn() };

  const createWrapper =
    () =>
    ({ children }: { children: React.ReactNode }) =>
      (
        <KibanaContextProvider services={{ core: coreStart, esql: esqlService }}>
          {children}
        </KibanaContextProvider>
      );

  const defaultParams = {
    query: 'FROM test_index',
    onUpdateAndSubmitQuery: jest.fn(),
  };

  const useControlledNlGeneration = (
    params: Omit<Parameters<typeof useNlGeneration>[0], 'nlValue' | 'setNlValue'>
  ) => {
    const [nlValue, setNlValue] = useState('');
    return { ...useNlGeneration({ ...params, nlValue, setNlValue }), nlValue, setNlValue };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    clearInferenceConnectorCache();
  });

  it('onNlSubmit does nothing when nlValue is empty', async () => {
    const { result } = renderHook(() => useControlledNlGeneration(defaultParams), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.onNlSubmit();
    });

    expect(coreStart.http.post).not.toHaveBeenCalled();
  });

  it('onNlSubmit calls onNlResult and keeps the prompt until the result is accepted', async () => {
    const onNlResult = jest.fn();
    (coreStart.http.post as jest.Mock).mockResolvedValue({ content: 'FROM logs | LIMIT 10' });

    const { result } = renderHook(
      () => useControlledNlGeneration({ ...defaultParams, onNlResult }),
      {
        wrapper: createWrapper(),
      }
    );

    act(() => result.current.setNlValue('show me logs'));
    await act(async () => {
      await result.current.onNlSubmit();
    });

    expect(onNlResult).toHaveBeenCalledWith(
      'FROM logs | LIMIT 10',
      expect.objectContaining({ onAccept: expect.any(Function) })
    );
    expect(defaultParams.onUpdateAndSubmitQuery).not.toHaveBeenCalled();
    expect(result.current.nlValue).toBe('show me logs');

    act(() => onNlResult.mock.calls[0][1].onAccept());

    expect(result.current.nlValue).toBe('');
  });

  it('onNlSubmit falls back to onUpdateAndSubmitQuery when onNlResult is not provided', async () => {
    (coreStart.http.post as jest.Mock).mockResolvedValue({ content: 'FROM logs | LIMIT 10' });

    const { result } = renderHook(() => useControlledNlGeneration(defaultParams), {
      wrapper: createWrapper(),
    });

    act(() => result.current.setNlValue('show me logs'));
    await act(async () => {
      await result.current.onNlSubmit();
    });

    expect(defaultParams.onUpdateAndSubmitQuery).toHaveBeenCalledWith('FROM logs | LIMIT 10');
    expect(result.current.nlValue).toBe('');
  });

  it('onNlSubmit shows the server error message on failure', async () => {
    (coreStart.http.post as jest.Mock).mockRejectedValue({
      body: { message: 'Connector unavailable', statusCode: 503 },
    });

    const { result } = renderHook(() => useControlledNlGeneration(defaultParams), {
      wrapper: createWrapper(),
    });

    act(() => result.current.setNlValue('show me logs'));
    await act(async () => {
      await result.current.onNlSubmit();
    });

    expect(coreStart.notifications.toasts.addDanger).toHaveBeenCalledWith({
      title: 'Connector unavailable',
    });
    expect(result.current.nlValue).toBe('show me logs');
  });

  it('onNlSubmit shows the fallback message when the error has no body message', async () => {
    (coreStart.http.post as jest.Mock).mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => useControlledNlGeneration(defaultParams), {
      wrapper: createWrapper(),
    });

    act(() => result.current.setNlValue('show me logs'));
    await act(async () => {
      await result.current.onNlSubmit();
    });

    expect(coreStart.notifications.toasts.addDanger).toHaveBeenCalledWith({
      title: 'Failed to generate ES|QL query',
    });
    expect(result.current.nlValue).toBe('show me logs');
  });

  it('onStopGeneration aborts the request, clears loading state and nlValue', async () => {
    (coreStart.http.post as jest.Mock).mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useControlledNlGeneration(defaultParams), {
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

  it('does not clear a new prompt when a stopped request later settles', async () => {
    let resolveFirst: (value: { content: string }) => void = () => {};
    (coreStart.http.post as jest.Mock).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        })
    );

    const { result } = renderHook(() => useControlledNlGeneration(defaultParams), {
      wrapper: createWrapper(),
    });

    act(() => result.current.setNlValue('first prompt'));
    act(() => {
      result.current.onNlSubmit();
    });
    act(() => result.current.onStopGeneration());
    act(() => result.current.setNlValue('second prompt'));

    await act(async () => {
      resolveFirst({ content: 'FROM first' });
    });

    expect(result.current.nlValue).toBe('second prompt');
    expect(result.current.isNlLoading).toBe(false);
  });

  it('does not reset an in-flight second request when a stopped request settles', async () => {
    let resolveFirst: (value: { content: string }) => void = () => {};
    (coreStart.http.post as jest.Mock)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          })
      )
      .mockImplementationOnce(() => new Promise(() => {}));

    const { result } = renderHook(() => useControlledNlGeneration(defaultParams), {
      wrapper: createWrapper(),
    });

    act(() => result.current.setNlValue('first prompt'));
    act(() => {
      result.current.onNlSubmit();
    });
    act(() => result.current.onStopGeneration());
    act(() => result.current.setNlValue('second prompt'));
    act(() => {
      result.current.onNlSubmit();
    });

    expect(result.current.isNlLoading).toBe(true);

    await act(async () => {
      resolveFirst({ content: 'FROM first' });
    });

    expect(result.current.nlValue).toBe('second prompt');
    expect(result.current.isNlLoading).toBe(true);
  });

  it('onNlSubmit is a no-op when already loading', async () => {
    (coreStart.http.post as jest.Mock).mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useControlledNlGeneration(defaultParams), {
      wrapper: createWrapper(),
    });

    act(() => result.current.setNlValue('show me logs'));
    act(() => {
      result.current.onNlSubmit();
    });

    expect(result.current.isNlLoading).toBe(true);

    await act(async () => {
      await result.current.onNlSubmit();
    });

    expect(coreStart.http.post).toHaveBeenCalledTimes(1);
  });

  describe('connector check', () => {
    beforeEach(() => {
      (useNlToEsqlCheck as jest.Mock).mockReturnValue(true);
    });

    afterEach(() => {
      (useNlToEsqlCheck as jest.Mock).mockReturnValue(false);
    });

    it.each([true, false])('hasConnector is %s when the esql service says so', async (expected) => {
      esqlService.hasInferenceConnector.mockResolvedValue(expected);

      const { result } = renderHook(() => useControlledNlGeneration(defaultParams), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.hasConnector).toBe(expected));
    });

    it('starts the next editor with the last known connector result', async () => {
      esqlService.hasInferenceConnector.mockResolvedValue(true);
      const wrapper = createWrapper();
      const first = renderHook(() => useControlledNlGeneration(defaultParams), { wrapper });

      await waitFor(() => expect(first.result.current.hasConnector).toBe(true));

      const second = renderHook(() => useControlledNlGeneration(defaultParams), { wrapper });
      expect(second.result.current.hasConnector).toBe(true);
    });
  });
});
