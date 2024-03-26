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
  const getTestEmbeddableFactory = () =>
    Promise.resolve({
      type: 'test',
      deserializeState: jest.fn(),
      buildEmbeddable: jest.fn(),
    } as ReactEmbeddableFactory);

  it('throws an error if requested embeddable factory type is not registered', () => {
    expect(() => getReactEmbeddableFactory('notRegistered')).rejects.toThrow(
      'No embeddable factory found for type: notRegistered'
    );
  });

  it('can register and get an embeddable factory', () => {
    const returnedFactory = getTestEmbeddableFactory();
    registerReactEmbeddableFactory('test', getTestEmbeddableFactory);
    expect(getReactEmbeddableFactory('test')).toEqual(returnedFactory);
  });

  it('can check if a factory is registered', () => {
    expect(reactEmbeddableRegistryHasKey('test')).toBe(true);
    expect(reactEmbeddableRegistryHasKey('notRegistered')).toBe(false);
  });
});
