/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SearchStrategyRegistry } from './search_strategy_registry';
// @ts-ignore
import { AbstractSearchStrategy } from './strategies/abstract_search_strategy';
// @ts-ignore
import { DefaultSearchStrategy } from './strategies/default_search_strategy';
// @ts-ignore
import { DefaultSearchCapabilities } from './default_search_capabilities';

class MockSearchStrategy extends AbstractSearchStrategy {
  checkForViability() {
    return Promise.resolve({
      isViable: true,
      capabilities: {},
    });
  }
}

describe('SearchStrategyRegister', () => {
  let registry: SearchStrategyRegistry;

  beforeAll(() => {
    registry = new SearchStrategyRegistry();
  });

  test('should init strategies register', () => {
    expect(
      registry.addStrategy({} as AbstractSearchStrategy)[0] instanceof DefaultSearchStrategy
    ).toBe(true);
  });

  test('should not add a strategy if it is not an instance of AbstractSearchStrategy', () => {
    const addedStrategies = registry.addStrategy({} as AbstractSearchStrategy);

    expect(addedStrategies.length).toEqual(1);
    expect(addedStrategies[0] instanceof DefaultSearchStrategy).toBe(true);
  });

  test('should return a DefaultSearchStrategy instance', async () => {
    const req = {};
    const indexPattern = '*';

    const { searchStrategy, capabilities } = (await registry.getViableStrategy(req, indexPattern))!;

    expect(searchStrategy instanceof DefaultSearchStrategy).toBe(true);
    expect(capabilities instanceof DefaultSearchCapabilities).toBe(true);
  });

  test('should add a strategy if it is an instance of AbstractSearchStrategy', () => {
    const anotherSearchStrategy = new MockSearchStrategy();
    const addedStrategies = registry.addStrategy(anotherSearchStrategy);

    expect(addedStrategies.length).toEqual(2);
    expect(addedStrategies[0] instanceof AbstractSearchStrategy).toBe(true);
  });

  test('should return a MockSearchStrategy instance', async () => {
    const req = {};
    const indexPattern = '*';
    const anotherSearchStrategy = new MockSearchStrategy();
    registry.addStrategy(anotherSearchStrategy);

    const { searchStrategy, capabilities } = (await registry.getViableStrategy(req, indexPattern))!;

    expect(searchStrategy instanceof MockSearchStrategy).toBe(true);
    expect(capabilities).toEqual({});
  });
});
