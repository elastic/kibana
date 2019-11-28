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
import { SearchStrategiesRegister } from './search_strategies_register';
import { AbstractSearchStrategy } from './strategies/abstract_search_strategy';
import { DefaultSearchStrategy } from './strategies/default_search_strategy';
import { AbstractSearchRequest } from './searh_requests/abstract_request';
import { DefaultSearchCapabilities } from './default_search_capabilities';

class MockSearchStrategy extends AbstractSearchStrategy {
  checkForViability() {
    return {
      isViable: true,
      capabilities: {},
    };
  }
}

describe('SearchStrategiesRegister', () => {
  let server;
  let strategies;
  let anotherSearchStrategy;

  beforeAll(() => {
    server = {
      expose: jest.fn((strategy, func) => {
        server[strategy] = func;
      }),
    };
    strategies = [
      ['AbstractSearchStrategy', AbstractSearchStrategy],
      ['AbstractSearchRequest', AbstractSearchRequest],
      ['DefaultSearchCapabilities', DefaultSearchCapabilities],
      ['addSearchStrategy', expect.any(Function)],
    ];

    SearchStrategiesRegister.init(server);
  });

  test('should init strategies register', () => {
    expect(server.expose.mock.calls).toEqual(strategies);
    expect(server.addSearchStrategy()[0] instanceof DefaultSearchStrategy).toBe(true);
  });

  test('should not add a strategy if it is not an instance of AbstractSearchStrategy', () => {
    const addedStrategies = server.addSearchStrategy({});

    expect(addedStrategies.length).toEqual(1);
    expect(addedStrategies[0] instanceof DefaultSearchStrategy).toBe(true);
  });

  test('should return a DefaultSearchStrategy instance', async () => {
    const req = {};
    const indexPattern = '*';

    const { searchStrategy, capabilities } = await SearchStrategiesRegister.getViableStrategy(
      req,
      indexPattern
    );

    expect(searchStrategy instanceof DefaultSearchStrategy).toBe(true);
    expect(capabilities instanceof DefaultSearchCapabilities).toBe(true);
  });

  test('should add a strategy if it is an instance of AbstractSearchStrategy', () => {
    anotherSearchStrategy = new MockSearchStrategy();
    const addedStrategies = server.addSearchStrategy(anotherSearchStrategy);

    expect(addedStrategies.length).toEqual(2);
    expect(addedStrategies[0] instanceof AbstractSearchStrategy).toBe(true);
  });

  test('should return a MockSearchStrategy instance', async () => {
    const req = {};
    const indexPattern = '*';

    const { searchStrategy, capabilities } = await SearchStrategiesRegister.getViableStrategy(
      req,
      indexPattern
    );

    expect(searchStrategy instanceof AbstractSearchStrategy).toBe(true);
    expect(capabilities).toEqual({});
  });
});
