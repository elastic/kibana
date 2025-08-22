/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Container } from 'inversify';
import { cacheInScope } from './utils';

describe('cacheInScope', () => {
  let parent: Container;
  let child: Container;
  let serviceIdentifier: symbol;
  let factory: jest.Mock;

  beforeEach(() => {
    parent = new Container();
    child = new Container({ parent });
    serviceIdentifier = Symbol('Service');
    factory = jest.fn(() => 'something');

    parent
      .bind(serviceIdentifier)
      .toDynamicValue(factory)
      .inRequestScope()
      .onActivation(cacheInScope(serviceIdentifier));
    parent.bind(Container).toConstantValue(parent);
    child.bind(Container).toConstantValue(child);
  });

  it('should cache resolved binding in a request scope', () => {
    expect(child.get(serviceIdentifier)).toBe('something');
    expect(child.get(serviceIdentifier)).toBe('something');
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('should rebind resolved binding in the container', () => {
    expect(parent.get(serviceIdentifier)).toBe('something');
    expect(parent.get(serviceIdentifier)).toBe('something');
    expect(factory).toHaveBeenCalledTimes(1);
  });
});
