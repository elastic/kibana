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
import { SingleSearchRequest } from './single_search_request';

describe('SingleSearchRequest', () => {
  let searchRequest;
  let req;
  let callWithRequest;
  let indexPattern;
  let getServiceMock;
  let includeFrozen;

  beforeEach(() => {
    includeFrozen = false;
    getServiceMock = jest.fn().mockResolvedValue(includeFrozen);
    req = {
      getUiSettingsService: jest.fn().mockReturnValue({ get: getServiceMock })
    };
    callWithRequest = jest.fn().mockReturnValue({});
    indexPattern = 'indexPattern';
    searchRequest = new SingleSearchRequest(req, callWithRequest, indexPattern);
  });

  test('should init an SingleSearchRequest instance', () => {
    expect(searchRequest.req).toBe(req);
    expect(searchRequest.callWithRequest).toBe(callWithRequest);
    expect(searchRequest.indexPattern).toBe(indexPattern);
    expect(searchRequest.search).toBeDefined();
  });

  test('should get the response from elastic search', async () => {
    const options = {};

    const responses = await searchRequest.search(options);

    expect(responses).toEqual([{}]);
    expect(req.getUiSettingsService).toHaveBeenCalled();
    expect(getServiceMock).toHaveBeenCalledWith('search:includeFrozen');
    expect(callWithRequest).toHaveBeenCalledWith(req, 'search', {
      ...options,
      index: indexPattern,
      ignore_throttled: !includeFrozen,
    });
  });
});
