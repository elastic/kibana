/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  registerReactEmbeddableFactory,
  reactEmbeddableRegistryHasKey,
  getReactEmbeddableFactory,
} from './react_embeddable_registry';
import { ReactEmbeddableFactory } from './types';

describe('react embeddable registry', () => {
  const testEmbeddableFactory: ReactEmbeddableFactory = {
    deserializeState: jest.fn(),
    getComponent: jest.fn(),
  };

  it('throws an error if requested embeddable factory type is not registered', () => {
    expect(() => getReactEmbeddableFactory('notRegistered')).toThrowErrorMatchingInlineSnapshot(
      `"No embeddable factory found for type: notRegistered"`
    );
  });

  it('can register and get an embeddable factory', () => {
    registerReactEmbeddableFactory('test', testEmbeddableFactory);
    expect(getReactEmbeddableFactory('test')).toBe(testEmbeddableFactory);
  });

  it('can check if a factory is registered', () => {
    expect(reactEmbeddableRegistryHasKey('test')).toBe(true);
    expect(reactEmbeddableRegistryHasKey('notRegistered')).toBe(false);
  });
});
