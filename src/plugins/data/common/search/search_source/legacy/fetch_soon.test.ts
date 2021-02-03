/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SearchResponse } from 'elasticsearch';
import { UI_SETTINGS } from '../../../constants';
import { GetConfigFn } from '../../../types';
import { FetchHandlers, SearchRequest } from '../fetch';
import { ISearchOptions } from '../../index';
import { callClient } from './call_client';
import { fetchSoon } from './fetch_soon';

function getConfigStub(config: any = {}): GetConfigFn {
  return (key) => config[key];
}

const mockResponses: Record<string, SearchResponse<any>> = {
  foo: {
    took: 1,
    timed_out: false,
  } as SearchResponse<any>,
  bar: {
    took: 2,
    timed_out: false,
  } as SearchResponse<any>,
  baz: {
    took: 3,
    timed_out: false,
  } as SearchResponse<any>,
};

jest.useFakeTimers();

jest.mock('./call_client', () => ({
  callClient: jest.fn((requests: SearchRequest[]) => {
    // Allow a request object to specify which mockResponse it wants to receive (_mockResponseId)
    // in addition to how long to simulate waiting before returning a response (_waitMs)
    const responses = requests.map((request) => {
      const waitMs = requests.reduce((total, { _waitMs }) => total + _waitMs || 0, 0);
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(mockResponses[request._mockResponseId]);
        }, waitMs);
      });
    });
    return Promise.resolve(responses);
  }),
}));

describe('fetchSoon', () => {
  beforeEach(() => {
    (callClient as jest.Mock).mockClear();
  });

  test('should execute asap if config is set to not batch searches', () => {
    const getConfig = getConfigStub({ [UI_SETTINGS.COURIER_BATCH_SEARCHES]: false });
    const request = {};
    const options = {};

    fetchSoon(request, options, { getConfig } as FetchHandlers);

    expect(callClient).toBeCalled();
  });

  test('should delay by 50ms if config is set to batch searches', () => {
    const getConfig = getConfigStub({ [UI_SETTINGS.COURIER_BATCH_SEARCHES]: true });
    const request = {};
    const options = {};

    fetchSoon(request, options, { getConfig } as FetchHandlers);

    expect(callClient).not.toBeCalled();
    jest.advanceTimersByTime(0);
    expect(callClient).not.toBeCalled();
    jest.advanceTimersByTime(50);
    expect(callClient).toBeCalled();
  });

  test('should send a batch of requests to callClient', () => {
    const getConfig = getConfigStub({ [UI_SETTINGS.COURIER_BATCH_SEARCHES]: true });
    const requests = [{ foo: 1 }, { foo: 2 }];
    const options = [{ bar: 1 }, { bar: 2 }];

    requests.forEach((request, i) => {
      fetchSoon(request, options[i] as ISearchOptions, { getConfig } as FetchHandlers);
    });

    jest.advanceTimersByTime(50);
    expect(callClient).toBeCalledTimes(1);
    expect((callClient as jest.Mock).mock.calls[0][0]).toEqual(requests);
    expect((callClient as jest.Mock).mock.calls[0][1]).toEqual(options);
  });

  test('should return the response to the corresponding call for multiple batched requests', async () => {
    const getConfig = getConfigStub({ [UI_SETTINGS.COURIER_BATCH_SEARCHES]: true });
    const requests = [{ _mockResponseId: 'foo' }, { _mockResponseId: 'bar' }];

    const promises = requests.map((request) => {
      return fetchSoon(request, {}, { getConfig } as FetchHandlers);
    });
    jest.advanceTimersByTime(50);
    const results = await Promise.all(promises);

    expect(results).toEqual([mockResponses.foo, mockResponses.bar]);
  });

  test('should wait for the previous batch to start before starting a new batch', () => {
    const getConfig = getConfigStub({ [UI_SETTINGS.COURIER_BATCH_SEARCHES]: true });
    const firstBatch = [{ foo: 1 }, { foo: 2 }];
    const secondBatch = [{ bar: 1 }, { bar: 2 }];

    firstBatch.forEach((request) => {
      fetchSoon(request, {}, { getConfig } as FetchHandlers);
    });
    jest.advanceTimersByTime(50);
    secondBatch.forEach((request) => {
      fetchSoon(request, {}, { getConfig } as FetchHandlers);
    });

    expect(callClient).toBeCalledTimes(1);
    expect((callClient as jest.Mock).mock.calls[0][0]).toEqual(firstBatch);

    jest.advanceTimersByTime(50);

    expect(callClient).toBeCalledTimes(2);
    expect((callClient as jest.Mock).mock.calls[1][0]).toEqual(secondBatch);
  });
});
