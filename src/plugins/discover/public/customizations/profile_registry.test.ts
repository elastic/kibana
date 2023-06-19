/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createCustomizeFunction, createProfileRegistry } from './profile_registry';

describe('createProfileRegistry', () => {
  it('should allow registering profiles', () => {
    const registry = createProfileRegistry();
    registry.set({
      name: 'test',
      customizationCallbacks: [],
    });
    registry.set({
      name: 'test2',
      customizationCallbacks: [],
    });
    expect(registry.get('test')).toEqual({
      name: 'test',
      customizationCallbacks: [],
    });
    expect(registry.get('test2')).toEqual({
      name: 'test2',
      customizationCallbacks: [],
    });
  });

  it('should allow overriding profiles', () => {
    const registry = createProfileRegistry();
    registry.set({
      name: 'test',
      customizationCallbacks: [],
    });
    expect(registry.get('test')).toEqual({
      name: 'test',
      customizationCallbacks: [],
    });
    const callback = jest.fn();
    registry.set({
      name: 'test',
      customizationCallbacks: [callback],
    });
    expect(registry.get('test')).toEqual({
      name: 'test',
      customizationCallbacks: [callback],
    });
  });

  it('should be case insensitive', () => {
    const registry = createProfileRegistry();
    registry.set({
      name: 'test',
      customizationCallbacks: [],
    });
    expect(registry.get('tEsT')).toEqual({
      name: 'test',
      customizationCallbacks: [],
    });
  });
});

describe('createCustomizeFunction', () => {
  test('should add a customization callback to the registry', () => {
    const registry = createProfileRegistry();
    const customize = createCustomizeFunction(registry);
    const callback = jest.fn();
    customize('test', callback);
    expect(registry.get('test')).toEqual({
      name: 'test',
      customizationCallbacks: [callback],
    });
    const callback2 = jest.fn();
    customize('test', callback2);
    expect(registry.get('test')).toEqual({
      name: 'test',
      customizationCallbacks: [callback, callback2],
    });
  });
});
