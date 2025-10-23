/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useEffect } from 'react';
import { renderHook, act } from '@testing-library/react';
import sinon from 'sinon';

import type { HttpSetup, HttpFetchOptions } from '@kbn/core/public';
import type { SendRequestConfig, SendRequestResponse } from './send_request';
import type { UseRequestResponse, UseRequestConfig } from './use_request';
import { useRequest } from './use_request';

export interface UseRequestHelpers {
  completeRequest: () => Promise<void>;
  hookResult: UseRequestResponse;
  getSendRequestSpy: () => sinon.SinonStub;
  setupSuccessRequest: (overrides?: {}, requestTimings?: number[]) => void;
  getSuccessResponse: () => SendRequestResponse;
  setupErrorRequest: (overrides?: {}, requestTimings?: number[]) => void;
  getErrorResponse: () => SendRequestResponse;
  setErrorResponse: (overrides?: {}) => void;
  setupErrorWithBodyRequest: (overrides?: {}) => void;
  getErrorWithBodyResponse: () => SendRequestResponse;
  teardown: () => Promise<void>; // For real timers
  teardownFake: () => Promise<void>; // For fake timers
}

// Short delay for tests using real timers
// Using 50ms to provide enough buffer for real timer async operations
export const REQUEST_TIME = 50;

const successRequest: SendRequestConfig = { method: 'post', path: '/success', body: {} };
const successResponse = { statusCode: 200, data: { message: 'Success message' } };

const errorValue = { statusCode: 400, statusText: 'Error message' };
const errorRequest: SendRequestConfig = { method: 'post', path: '/error', body: {} };
const errorResponse = { response: { data: errorValue } };

const errorWithBodyRequest: SendRequestConfig = {
  method: 'post',
  path: '/errorWithBody',
  body: {},
};
const errorWithBodyResponse = { body: errorValue };

export const createUseRequestHelpers = (): UseRequestHelpers => {
  // The behavior we're testing involves state changes over time, so we need finer control over
  // timing.
  jest.useFakeTimers();

  const completeRequest = async () => {
    await act(async () => {
      await jest.runAllTimersAsync();
    });
  };

  let hookReturn: ReturnType<
    typeof renderHook<UseRequestResponse, { requestConfig: UseRequestConfig }>
  >;
  // We'll use this object to observe the state of the hook and access its callback(s).
  const hookResult = {} as UseRequestResponse;
  const sendRequestSpy = sinon.stub();

  const setupUseRequest = (config: UseRequestConfig, requestTimings?: number[]) => {
    let requestCount = 0;

    const httpClient = {
      post: (path: string, options: HttpFetchOptions) => {
        return new Promise((resolve, reject) => {
          // Increase the time it takes to resolve a request so we have time to inspect the hook
          // as it goes through various states.
          setTimeout(() => {
            try {
              resolve(sendRequestSpy(path, options));
            } catch (e) {
              reject(e);
            }
          }, (requestTimings && requestTimings[requestCount++]) || REQUEST_TIME);
        });
      },
    };

    const Wrapper = ({ children }: { children?: React.ReactNode }) => {
      // Force a re-render to stress-test the useRequest hook and verify its
      // state remains unaffected.
      const [, setState] = useState(false);
      useEffect(() => {
        setState(true);
      }, []);
      return <>{children}</>;
    };

    hookReturn = renderHook(
      ({ requestConfig }) => {
        const result = useRequest(httpClient as HttpSetup, requestConfig);
        // Sync the result to hookResult object for compatibility with existing tests
        Object.assign(hookResult, result);
        return result;
      },
      {
        initialProps: { requestConfig: config },
        wrapper: Wrapper,
      }
    );
  };

  // Set up successful request helpers.
  sendRequestSpy
    .withArgs(
      successRequest.path,
      sinon.match({
        body: JSON.stringify(successRequest.body),
        query: undefined,
      })
    )
    .resolves(successResponse);
  const setupSuccessRequest = (overrides = {}, requestTimings?: number[]) =>
    setupUseRequest({ ...successRequest, ...overrides }, requestTimings);
  const getSuccessResponse = () => ({ data: successResponse.data, error: null });

  // Set up failed request helpers.
  sendRequestSpy
    .withArgs(
      errorRequest.path,
      sinon.match({
        body: JSON.stringify(errorRequest.body),
        query: undefined,
      })
    )
    .rejects(errorResponse);
  const setupErrorRequest = (overrides = {}, requestTimings?: number[]) =>
    setupUseRequest({ ...errorRequest, ...overrides }, requestTimings);
  const getErrorResponse = () => ({
    data: null,
    error: errorResponse.response.data,
  });
  // We'll use this to change a success response to an error response, to test how the state changes.
  const setErrorResponse = (overrides = {}) => {
    hookReturn.rerender({ requestConfig: { ...errorRequest, ...overrides } });
  };

  // Set up failed request helpers with the alternative error shape.
  sendRequestSpy
    .withArgs(
      errorWithBodyRequest.path,
      sinon.match({
        body: JSON.stringify(errorWithBodyRequest.body),
        query: undefined,
      })
    )
    .rejects(errorWithBodyResponse);
  const setupErrorWithBodyRequest = (overrides = {}) =>
    setupUseRequest({ ...errorWithBodyRequest, ...overrides });
  const getErrorWithBodyResponse = () => ({
    data: null,
    error: errorWithBodyResponse.body,
  });

  const teardownFake = async () => {
    hookReturn?.unmount();
    await jest.runOnlyPendingTimersAsync();
    jest.clearAllTimers();
    jest.useRealTimers();
    sendRequestSpy.resetHistory();
  };

  const teardown = async () => {
    hookReturn?.unmount();
    // Wait briefly for any pending real timers to complete
    await new Promise((resolve) => setTimeout(resolve, 20));
    sendRequestSpy.resetHistory();
  };

  return {
    completeRequest,
    hookResult,
    getSendRequestSpy: () => sendRequestSpy,
    setupSuccessRequest,
    getSuccessResponse,
    setupErrorRequest,
    getErrorResponse,
    setErrorResponse,
    setupErrorWithBodyRequest,
    getErrorWithBodyResponse,
    teardown,
    teardownFake,
  };
};
