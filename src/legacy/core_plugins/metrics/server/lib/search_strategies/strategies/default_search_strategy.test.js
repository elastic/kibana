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
import { DefaultSearchStrategy } from './default_search_strategy';

describe('DefaultSearchStrategy', () => {
  let defaultSearchStrategy;
  let server;
  let callWithRequest;
  let req;

  beforeEach(() => {
    server = {};
    callWithRequest = jest.fn();
    req = {
      server: {
        plugins: {
          elasticsearch: {
            getCluster: jest.fn().mockReturnValue({
              callWithRequest,
            }),
          },
        },
      },
    };
    defaultSearchStrategy = new DefaultSearchStrategy(server);
  });

  test('should init an DefaultSearchStrategy instance', () => {
    expect(defaultSearchStrategy.name).toBe('default');
    expect(defaultSearchStrategy.checkForViability).toBeDefined();
    expect(defaultSearchStrategy.getCallWithRequestInstance).toBeDefined();
    expect(defaultSearchStrategy.getSearchRequest).toBeDefined();
    expect(defaultSearchStrategy.getFieldsForWildcard).toBeDefined();
  });

  test('should invoke callWithRequestFactory with passed params', () => {
    const value = defaultSearchStrategy.getCallWithRequestInstance(req);

    expect(value).toBe(callWithRequest);
    expect(req.server.plugins.elasticsearch.getCluster).toHaveBeenCalledWith('data');
  });

  test('should check a strategy for viability', () => {
    const value = defaultSearchStrategy.checkForViability(req);

    expect(value.isViable).toBe(true);
    expect(value.capabilities).toEqual({
      request: req,
      fieldsCapabilities: {},
    });
  });
});
