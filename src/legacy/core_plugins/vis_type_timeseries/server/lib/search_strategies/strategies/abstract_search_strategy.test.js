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
import { AbstractSearchStrategy } from './abstract_search_strategy';

class SearchRequest {
  constructor(req, callWithRequest) {
    this.req = req;
    this.callWithRequest = callWithRequest;
  }
}

describe('AbstractSearchStrategy', () => {
  let abstractSearchStrategy;
  let server;
  let callWithRequestFactory;
  let req;
  let mockedFields;
  let indexPattern;

  beforeEach(() => {
    server = {};
    callWithRequestFactory = jest.fn().mockReturnValue('callWithRequest');
    mockedFields = {};
    req = {
      pre: {
        indexPatternsService: {
          getFieldsForWildcard: jest.fn().mockReturnValue(mockedFields),
        },
      },
    };

    abstractSearchStrategy = new AbstractSearchStrategy(
      server,
      callWithRequestFactory,
      SearchRequest
    );
  });

  test('should init an AbstractSearchStrategy instance', () => {
    expect(abstractSearchStrategy.getCallWithRequestInstance).toBeDefined();
    expect(abstractSearchStrategy.getSearchRequest).toBeDefined();
    expect(abstractSearchStrategy.getFieldsForWildcard).toBeDefined();
    expect(abstractSearchStrategy.checkForViability).toBeDefined();
  });

  test('should return fields for wildcard', async () => {
    const fields = await abstractSearchStrategy.getFieldsForWildcard(req, indexPattern);

    expect(fields).toBe(mockedFields);
    expect(req.pre.indexPatternsService.getFieldsForWildcard).toHaveBeenCalledWith({
      pattern: indexPattern,
    });
  });

  test('should invoke callWithRequestFactory with req param passed', () => {
    abstractSearchStrategy.getCallWithRequestInstance(req);

    expect(callWithRequestFactory).toHaveBeenCalledWith(server, req);
  });

  test('should return a search request', () => {
    const searchRequest = abstractSearchStrategy.getSearchRequest(req);

    expect(searchRequest instanceof SearchRequest).toBe(true);
    expect(searchRequest.callWithRequest).toBe('callWithRequest');
    expect(searchRequest.req).toBe(req);
  });
});
