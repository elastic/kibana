/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  registerReactEmbeddableFactory,
  getReactEmbeddableFactory,
  getComposableFetchContextFactory,
  registerComposableFetchContextFactory,
} from './react_embeddable_registry';
import type { ComposableFetchContextFactory, EmbeddableFactory } from './types';

describe('embeddable registry', () => {
  const getTestEmbeddableFactory = () =>
    Promise.resolve({
      type: 'test',
      buildEmbeddable: jest.fn(),
    } as EmbeddableFactory);

  const getTestComposableContextFactory = () =>
    Promise.resolve({
      type: 'test',
      buildFetchContext: jest.fn(),
    } as ComposableFetchContextFactory);

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

  it('throws an error if requested composable context factory type is not registered', () => {
    expect(() => getComposableFetchContextFactory('notRegistered')).rejects.toThrow(
      'No composable fetch context factory found for type: notRegistered'
    );
  });

  it('can register and get a composabble context factory', () => {
    const returnedFactory = getTestComposableContextFactory();
    registerComposableFetchContextFactory('test', getTestComposableContextFactory);
    expect(getComposableFetchContextFactory('test')).toEqual(returnedFactory);
  });
});
