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

import { callClient } from './call_client';
import { handleResponse } from './handle_response';
import { FetchHandlers, SearchRequest, SearchStrategySearchParams } from '../types';

const mockResponses = [{}, {}];
const mockAbortFns = [jest.fn(), jest.fn()];
const mockSearchFns = [
  jest.fn(({ searchRequests }: SearchStrategySearchParams) => ({
    searching: Promise.resolve(Array(searchRequests.length).fill(mockResponses[0])),
    abort: mockAbortFns[0],
  })),
  jest.fn(({ searchRequests }: SearchStrategySearchParams) => ({
    searching: Promise.resolve(Array(searchRequests.length).fill(mockResponses[1])),
    abort: mockAbortFns[1],
  })),
];
const mockSearchStrategies = mockSearchFns.map((search, i) => ({ search, id: i }));

jest.mock('./handle_response', () => ({
  handleResponse: jest.fn((request, response) => response),
}));

jest.mock('../search_strategy', () => ({
  getSearchStrategyForSearchRequest: (request: SearchRequest) =>
    mockSearchStrategies[request._searchStrategyId],
  getSearchStrategyById: (id: number) => mockSearchStrategies[id],
}));

describe('callClient', () => {
  beforeEach(() => {
    (handleResponse as jest.Mock).mockClear();
    mockAbortFns.forEach(fn => fn.mockClear());
    mockSearchFns.forEach(fn => fn.mockClear());
  });

  test('Executes each search strategy with its group of matching requests', () => {
    const searchRequests = [
      { _searchStrategyId: 0 },
      { _searchStrategyId: 1 },
      { _searchStrategyId: 0 },
      { _searchStrategyId: 1 },
    ];

    callClient(searchRequests, [], {} as FetchHandlers);

    expect(mockSearchFns[0]).toBeCalled();
    expect(mockSearchFns[0].mock.calls[0][0].searchRequests).toEqual([
      searchRequests[0],
      searchRequests[2],
    ]);
    expect(mockSearchFns[1]).toBeCalled();
    expect(mockSearchFns[1].mock.calls[0][0].searchRequests).toEqual([
      searchRequests[1],
      searchRequests[3],
    ]);
  });

  test('Passes the additional arguments it is given to the search strategy', () => {
    const searchRequests = [{ _searchStrategyId: 0 }];
    const args = { es: {}, config: {}, esShardTimeout: 0 } as FetchHandlers;

    callClient(searchRequests, [], args);

    expect(mockSearchFns[0]).toBeCalled();
    expect(mockSearchFns[0].mock.calls[0][0]).toEqual({ searchRequests, ...args });
  });

  test('Returns the responses in the original order', async () => {
    const searchRequests = [{ _searchStrategyId: 1 }, { _searchStrategyId: 0 }];

    const responses = await Promise.all(callClient(searchRequests, [], {} as FetchHandlers));

    expect(responses).toEqual([mockResponses[1], mockResponses[0]]);
  });

  test('Calls handleResponse with each request and response', async () => {
    const searchRequests = [{ _searchStrategyId: 0 }, { _searchStrategyId: 1 }];

    const responses = callClient(searchRequests, [], {} as FetchHandlers);
    await Promise.all(responses);

    expect(handleResponse).toBeCalledTimes(2);
    expect(handleResponse).toBeCalledWith(searchRequests[0], mockResponses[0]);
    expect(handleResponse).toBeCalledWith(searchRequests[1], mockResponses[1]);
  });

  test('If passed an abortSignal, calls abort on the strategy if the signal is aborted', () => {
    const searchRequests = [{ _searchStrategyId: 0 }, { _searchStrategyId: 1 }];
    const abortController = new AbortController();
    const requestOptions = [
      {
        abortSignal: abortController.signal,
      },
    ];

    callClient(searchRequests, requestOptions, {} as FetchHandlers);
    abortController.abort();

    expect(mockAbortFns[0]).toBeCalled();
    expect(mockAbortFns[1]).not.toBeCalled();
  });
});
