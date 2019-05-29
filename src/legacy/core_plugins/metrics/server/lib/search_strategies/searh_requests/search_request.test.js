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
import { SearchRequest } from './search_request';
import { MultiSearchRequest } from './multi_search_request';
import { SingleSearchRequest } from './single_search_request';

describe('SearchRequest', () => {
  let searchRequest;
  let req;
  let callWithRequest;
  let getServiceMock;
  let includeFrozen;

  beforeEach(() => {
    includeFrozen = false;
    getServiceMock = jest.fn().mockResolvedValue(includeFrozen);
    req = {
      getUiSettingsService: jest.fn().mockReturnValue({ get: getServiceMock }),
    };
    callWithRequest = jest.fn().mockReturnValue({ responses: [] });
    searchRequest = new SearchRequest(req, callWithRequest);
  });

  test('should init an AbstractSearchRequest instance', () => {
    expect(searchRequest.req).toBe(req);
    expect(searchRequest.callWithRequest).toBe(callWithRequest);
    expect(searchRequest.search).toBeDefined();
  });

  test('should return search value', async () => {
    const concreteSearchRequest = {
      search: jest.fn().mockReturnValue('concreteSearchRequest'),
    };
    const options = {};
    searchRequest.getSearchRequestType = jest.fn().mockReturnValue(concreteSearchRequest);

    const result = await searchRequest.search(options);

    expect(result).toBe('concreteSearchRequest');
  });

  test('should return a MultiSearchRequest for multi searches', () => {
    const searches = [{ index: 'index', body: 'body' }, { index: 'index', body: 'body' }];

    const result = searchRequest.getSearchRequestType(searches);

    expect(result instanceof MultiSearchRequest).toBe(true);
  });

  test('should return a SingleSearchRequest for single search', () => {
    const searches = [{ index: 'index', body: 'body' }];

    const result = searchRequest.getSearchRequestType(searches);

    expect(result instanceof SingleSearchRequest).toBe(true);
  });
});
