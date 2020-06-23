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

import { Observable, Subject } from 'rxjs';
import { CoreStart } from '../../../../core/public';
import { coreMock } from '../../../../core/public/mocks';
import { IKibanaSearchRequest } from '../../common/search';
import { RequestTimeoutError } from './request_timeout_error';
import { SearchInterceptor } from './search_interceptor';

jest.useFakeTimers();

const mockSearch = jest.fn();
let searchInterceptor: SearchInterceptor;
let mockCoreStart: MockedKeys<CoreStart>;

describe('SearchInterceptor', () => {
  beforeEach(() => {
    mockCoreStart = coreMock.createStart();
    mockSearch.mockClear();
    searchInterceptor = new SearchInterceptor(
      mockCoreStart.notifications.toasts,
      mockCoreStart.application,
      1000
    );
  });

  describe('search', () => {
    test('should invoke `search` with the request', () => {
      const mockResponse = new Subject();
      mockSearch.mockReturnValue(mockResponse.asObservable());
      const mockRequest: IKibanaSearchRequest = {};
      const response = searchInterceptor.search(mockSearch, mockRequest);
      mockResponse.complete();

      response.subscribe();
      expect(mockSearch.mock.calls[0][0]).toBe(mockRequest);
    });

    test('should mirror the observable to completion if the request does not time out', () => {
      const mockResponse = new Subject();
      mockSearch.mockReturnValue(mockResponse.asObservable());
      const response = searchInterceptor.search(mockSearch, {});

      setTimeout(() => mockResponse.next('hi'), 250);
      setTimeout(() => mockResponse.complete(), 500);

      const next = jest.fn();
      const complete = jest.fn();
      response.subscribe({ next, complete });

      jest.advanceTimersByTime(1000);

      expect(next).toHaveBeenCalledWith('hi');
      expect(complete).toHaveBeenCalled();
    });

    test('should mirror the observable to error if the request does not time out', () => {
      const mockResponse = new Subject();
      mockSearch.mockReturnValue(mockResponse.asObservable());
      const response = searchInterceptor.search(mockSearch, {});

      setTimeout(() => mockResponse.next('hi'), 250);
      setTimeout(() => mockResponse.error('error'), 500);

      const next = jest.fn();
      const error = jest.fn();
      response.subscribe({ next, error });

      jest.advanceTimersByTime(1000);

      expect(next).toHaveBeenCalledWith('hi');
      expect(error).toHaveBeenCalledWith('error');
    });

    test('should return a `RequestTimeoutError` if the request times out', () => {
      mockSearch.mockReturnValue(new Observable());
      const response = searchInterceptor.search(mockSearch, {});

      const error = jest.fn();
      response.subscribe({ error });

      jest.advanceTimersByTime(1000);

      expect(error).toHaveBeenCalled();
      expect(error.mock.calls[0][0] instanceof RequestTimeoutError).toBe(true);
    });
  });

  describe('getPendingCount$', () => {
    test('should observe the number of pending requests', () => {
      let i = 0;
      const mockResponses = [new Subject(), new Subject()];
      mockSearch.mockImplementation(() => mockResponses[i++]);

      const pendingCount$ = searchInterceptor.getPendingCount$();

      const next = jest.fn();
      pendingCount$.subscribe(next);

      const error = jest.fn();
      searchInterceptor.search(mockSearch, {}).subscribe({ error });
      searchInterceptor.search(mockSearch, {}).subscribe({ error });

      setTimeout(() => mockResponses[0].complete(), 250);
      setTimeout(() => mockResponses[1].error('error'), 500);

      jest.advanceTimersByTime(500);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls).toEqual([[0], [1], [2], [1], [0]]);
    });
  });
});
