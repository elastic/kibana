/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect } from 'react';
import { act } from 'react-dom/test-utils';
import { mount, ReactWrapper } from 'enzyme';
import sinon from 'sinon';

import { HttpSetup, HttpFetchOptions } from '@kbn/core/public';
import { SendRequestConfig, SendRequestResponse } from './send_request';
import { useRequest, UseRequestResponse, UseRequestConfig } from './use_request';

export interface UseRequestHelpers {
  advanceTime: (ms: number) => Promise<void>;
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
}

// Each request will take 1s to resolve.
export const REQUEST_TIME = 1000;

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

  const flushPromiseJobQueue = async () => {
    // See https://stackoverflow.com/questions/52177631/jest-timer-and-promise-dont-work-well-settimeout-and-async-function
    await Promise.resolve();
  };

  const completeRequest = async () => {
    await act(async () => {
      jest.runAllTimers();
      await flushPromiseJobQueue();
    });
  };

  const advanceTime = async (ms: number) => {
    await act(async () => {
      jest.advanceTimersByTime(ms);
      await flushPromiseJobQueue();
    });
  };

  let element: ReactWrapper;
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

    const TestComponent = ({ requestConfig }: { requestConfig: UseRequestConfig }) => {
      const { isInitialRequest, isLoading, error, data, resendRequest } = useRequest(
        httpClient as HttpSetup,
        requestConfig
      );

      // Force a re-render of the component to stress-test the useRequest hook and verify its
      // state remains unaffected.
      const [, setState] = useState(false);
      useEffect(() => {
        setState(true);
      }, []);

      hookResult.isInitialRequest = isInitialRequest;
      hookResult.isLoading = isLoading;
      hookResult.error = error;
      hookResult.data = data;
      hookResult.resendRequest = resendRequest;

      return null;
    };

    act(() => {
      element = mount(<TestComponent requestConfig={config} />);
    });
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
    element.setProps({ requestConfig: { ...errorRequest, ...overrides } });
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

  return {
    advanceTime,
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
  };
};
