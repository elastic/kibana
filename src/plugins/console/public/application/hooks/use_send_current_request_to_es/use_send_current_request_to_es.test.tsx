/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

jest.mock('./send_request_to_es', () => ({ sendRequestToES: jest.fn() }));
jest.mock('../../contexts/editor_context/editor_registry', () => ({
  instance: { getInputEditor: jest.fn() },
}));
jest.mock('./track', () => ({ track: jest.fn() }));
jest.mock('../../contexts/request_context', () => ({ useRequestActionContext: jest.fn() }));

import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';

import { ContextValue, ServicesContextProvider } from '../../contexts';
import { serviceContextMock } from '../../contexts/services_context.mock';
import { useRequestActionContext } from '../../contexts/request_context';
import { instance as editorRegistry } from '../../contexts/editor_context/editor_registry';

import { sendRequestToES } from './send_request_to_es';
import { useSendCurrentRequestToES } from './use_send_current_request_to_es';

describe('useSendCurrentRequestToES', () => {
  let mockContextValue: ContextValue;
  let dispatch: (...args: unknown[]) => void;
  const contexts = ({ children }: { children: JSX.Element }) => (
    <ServicesContextProvider value={mockContextValue}>{children}</ServicesContextProvider>
  );

  beforeEach(() => {
    mockContextValue = serviceContextMock.create();
    dispatch = jest.fn();
    (useRequestActionContext as jest.Mock).mockReturnValue(dispatch);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('calls send request to ES', async () => {
    // Set up mocks
    (mockContextValue.services.settings.toJSON as jest.Mock).mockReturnValue({});
    // This request should succeed
    (sendRequestToES as jest.Mock).mockResolvedValue([]);
    (editorRegistry.getInputEditor as jest.Mock).mockImplementation(() => ({
      getRequestsInRange: () => ['test'],
    }));

    const { result } = renderHook(() => useSendCurrentRequestToES(), { wrapper: contexts });
    await act(() => result.current());
    expect(sendRequestToES).toHaveBeenCalledWith({ requests: ['test'] });

    // Second call should be the request success
    const [, [requestSucceededCall]] = (dispatch as jest.Mock).mock.calls;
    expect(requestSucceededCall).toEqual({ type: 'requestSuccess', payload: { data: [] } });
  });

  it('handles known errors', async () => {
    // Set up mocks
    (sendRequestToES as jest.Mock).mockRejectedValue({ response: 'nada' });
    (editorRegistry.getInputEditor as jest.Mock).mockImplementation(() => ({
      getRequestsInRange: () => ['test'],
    }));

    const { result } = renderHook(() => useSendCurrentRequestToES(), { wrapper: contexts });
    await act(() => result.current());
    // Second call should be the request failure
    const [, [requestFailedCall]] = (dispatch as jest.Mock).mock.calls;

    // The request must have concluded
    expect(requestFailedCall).toEqual({ type: 'requestFail', payload: { response: 'nada' } });
  });

  it('handles unknown errors', async () => {
    // Set up mocks
    (sendRequestToES as jest.Mock).mockRejectedValue(NaN /* unexpected error value */);
    (editorRegistry.getInputEditor as jest.Mock).mockImplementation(() => ({
      getRequestsInRange: () => ['test'],
    }));

    const { result } = renderHook(() => useSendCurrentRequestToES(), { wrapper: contexts });
    await act(() => result.current());
    // Second call should be the request failure
    const [, [requestFailedCall]] = (dispatch as jest.Mock).mock.calls;

    // The request must have concluded
    expect(requestFailedCall).toEqual({ type: 'requestFail', payload: undefined });
    // It also notified the user
    expect(mockContextValue.services.notifications.toasts.addError).toHaveBeenCalledWith(NaN, {
      title: 'Unknown Request Error',
    });
  });

  it('notifies the user about save to history errors once only', async () => {
    // Set up mocks
    (sendRequestToES as jest.Mock).mockReturnValue(
      [{ request: {} }, { request: {} }] /* two responses to save history */
    );
    (mockContextValue.services.settings.toJSON as jest.Mock).mockReturnValue({});
    (mockContextValue.services.history.addToHistory as jest.Mock).mockImplementation(() => {
      // Mock throwing
      throw new Error('cannot save!');
    });
    (editorRegistry.getInputEditor as jest.Mock).mockImplementation(() => ({
      getRequestsInRange: () => ['test', 'test'],
    }));

    const { result } = renderHook(() => useSendCurrentRequestToES(), { wrapper: contexts });
    await act(() => result.current());

    expect(dispatch).toHaveBeenCalledTimes(2);

    expect(mockContextValue.services.history.addToHistory).toHaveBeenCalledTimes(2);
    // It only called notification once
    expect(mockContextValue.services.notifications.toasts.addError).toHaveBeenCalledTimes(1);
  });
});
