/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';
import { SearchStrategyRegistry } from './search_strategy_registry';
import { AbstractSearchStrategy, DefaultSearchStrategy } from './strategies';
import { DefaultSearchCapabilities } from './capabilities/default_search_capabilities';
import { Framework } from '../../plugin';
import { VisTypeTimeseriesRequest, VisTypeTimeseriesRequestHandlerContext } from '../../types';

const getPrivateField = <T>(registry: SearchStrategyRegistry, field: string) =>
  get(registry, field) as T;

class MockSearchStrategy extends AbstractSearchStrategy {
  checkForViability() {
    return Promise.resolve({
      isViable: true,
      capabilities: {},
    });
  }
}

describe('SearchStrategyRegister', () => {
  const framework = {} as Framework;
  const requestContext = {} as VisTypeTimeseriesRequestHandlerContext;
  let registry: SearchStrategyRegistry;

  beforeAll(() => {
    registry = new SearchStrategyRegistry();
    registry.addStrategy(new DefaultSearchStrategy(framework));
  });

  test('should init strategies register', () => {
    expect(getPrivateField(registry, 'strategies')).toHaveLength(1);
  });

  test('should not add a strategy if it is not an instance of AbstractSearchStrategy', () => {
    const addedStrategies = registry.addStrategy({} as AbstractSearchStrategy);

    expect(addedStrategies.length).toEqual(1);
  });

  test('should return a DefaultSearchStrategy instance', async () => {
    const req = {} as VisTypeTimeseriesRequest;
    const indexPattern = '*';

    const { searchStrategy, capabilities } = (await registry.getViableStrategy(
      requestContext,
      req,
      indexPattern
    ))!;

    expect(searchStrategy instanceof DefaultSearchStrategy).toBe(true);
    expect(capabilities instanceof DefaultSearchCapabilities).toBe(true);
  });

  test('should add a strategy if it is an instance of AbstractSearchStrategy', () => {
    const anotherSearchStrategy = new MockSearchStrategy(framework);
    const addedStrategies = registry.addStrategy(anotherSearchStrategy);

    expect(addedStrategies.length).toEqual(2);
    expect(addedStrategies[0] instanceof AbstractSearchStrategy).toBe(true);
  });

  test('should return a MockSearchStrategy instance', async () => {
    const req = {} as VisTypeTimeseriesRequest;
    const indexPattern = '*';
    const anotherSearchStrategy = new MockSearchStrategy(framework);
    registry.addStrategy(anotherSearchStrategy);

    const { searchStrategy, capabilities } = (await registry.getViableStrategy(
      requestContext,
      req,
      indexPattern
    ))!;

    expect(searchStrategy instanceof MockSearchStrategy).toBe(true);
    expect(capabilities).toEqual({});
  });
});
