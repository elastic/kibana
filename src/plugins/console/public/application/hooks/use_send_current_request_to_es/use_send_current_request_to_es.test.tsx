/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
  let dispatch: (...args: any[]) => void;
  const contexts = ({ children }: { children?: any }) => (
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
});
