/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Actions, Store } from './request';
import { reducer, initialValue } from './request';
import type { RequestResult } from '../hooks/use_send_current_request/send_request';
import type { BaseResponseType } from '../../types/common';

describe('request store', () => {
  it('should return initial state when no action matches', () => {
    const action = { type: 'unknown' } as any;
    const newState = reducer(initialValue, action);
    expect(newState).toBe(initialValue);
  });

  it('should handle sendRequest action and create new state object', () => {
    const action: Actions = { type: 'sendRequest', payload: undefined };
    const newState = reducer(initialValue, action);

    expect(newState).not.toBe(initialValue);
    expect(newState.requestInFlight).toBe(true);
    expect(newState.lastResult.data).toBe(null);

    // Verify immutability - original state unchanged
    expect(initialValue.requestInFlight).toBe(false);
  });

  it('should handle requestSuccess action with proper immutability', () => {
    const mockData: RequestResult[] = [
      {
        response: {
          value: 'test response',
          statusCode: 200,
          statusText: 'OK',
          timeMs: 100,
          contentType: 'application/json' as BaseResponseType,
        },
        request: { data: 'test', method: 'GET', path: '/test' },
      },
    ];

    const action: Actions = { type: 'requestSuccess', payload: { data: mockData } };
    const stateWithRequest: Store = {
      requestInFlight: true,
      lastResult: { data: null },
    };

    const newState = reducer(stateWithRequest, action);

    expect(newState).not.toBe(stateWithRequest);
    expect(newState.requestInFlight).toBe(false);
    expect(newState.lastResult.data).toBe(mockData);

    // Verify immutability
    expect(stateWithRequest.requestInFlight).toBe(true);
    expect(stateWithRequest.lastResult.data).toBe(null);
  });

  it('should handle requestFail action and preserve error', () => {
    const errorResult: RequestResult<string> = {
      response: {
        value: 'Network error',
        statusCode: 500,
        statusText: 'Internal Server Error',
        timeMs: 100,
        contentType: 'application/json' as BaseResponseType,
      },
      request: { data: 'test', method: 'GET', path: '/test' },
    };

    const action: Actions = { type: 'requestFail', payload: errorResult };
    const stateWithRequest: Store = {
      requestInFlight: true,
      lastResult: { data: null },
    };

    const newState = reducer(stateWithRequest, action);

    expect(newState).not.toBe(stateWithRequest);
    expect(newState.requestInFlight).toBe(false);
    expect(newState.lastResult.error).toBe(errorResult);
    expect(newState.lastResult.data).toBe(null);
  });

  it('should handle cleanRequest action', () => {
    const stateWithData: Store = {
      requestInFlight: true,
      lastResult: {
        data: [
          {
            response: {
              value: 'test',
              statusCode: 200,
              statusText: 'OK',
              timeMs: 50,
              contentType: 'application/json' as BaseResponseType,
            },
            request: { data: '', method: 'GET', path: '/' },
          },
        ],
        error: {
          response: {
            value: 'Error',
            statusCode: 400,
            statusText: 'Bad Request',
            timeMs: 10,
            contentType: 'application/json' as BaseResponseType,
          },
          request: { data: '', method: 'GET', path: '/' },
        },
      },
    };

    const action: Actions = { type: 'cleanRequest', payload: undefined };
    const newState = reducer(stateWithData, action);

    expect(newState).not.toBe(stateWithData);
    expect(newState.requestInFlight).toBe(false);
    expect(newState.lastResult.data).toBe(null);
    expect(newState.lastResult.error).toBeUndefined();

    // Verify original state unchanged
    expect(stateWithData.requestInFlight).toBe(true);
    expect(stateWithData.lastResult.data).not.toBe(null);
  });

  it('should handle nested object updates without affecting original state', () => {
    const initialStateWithData: Store = {
      requestInFlight: false,
      lastResult: {
        data: [
          {
            response: {
              value: 'original',
              statusCode: 200,
              statusText: 'OK',
              timeMs: 75,
              contentType: 'application/json' as BaseResponseType,
            },
            request: { data: '', method: 'GET', path: '/' },
          },
        ],
      },
    };

    const action: Actions = { type: 'sendRequest', payload: undefined };
    const newState = reducer(initialStateWithData, action);

    // Deep immutability check
    expect(initialStateWithData.lastResult.data).toBeTruthy();
    expect(newState.lastResult.data).toBe(null);
  });
});
