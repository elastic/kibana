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
} from './react_embeddable_registry';
import { EmbeddableFactory } from './types';

describe('embeddable registry', () => {
  const getTestEmbeddableFactory = () =>
    Promise.resolve({
      type: 'test',
      buildEmbeddable: jest.fn(),
    } as EmbeddableFactory);

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
});
