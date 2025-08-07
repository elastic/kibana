/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Container } from 'inversify';
import { toContainerModule, toServiceIdentifier } from './utils';

describe('toContainerModule', () => {
  it('should create a container module with bindings for each key-value pair in the object', () => {
    const container = new Container();
    const dictionary = {
      key1: 'value1',
      key2: 'value2',
    };
    const iteratee = jest.fn().mockReturnValueOnce('1').mockReturnValueOnce('2');
    const module = toContainerModule(dictionary, iteratee);

    container.loadSync(module);

    expect(iteratee).toHaveBeenCalledTimes(2);
    expect(iteratee).toHaveBeenNthCalledWith(1, 'key1');
    expect(iteratee).toHaveBeenNthCalledWith(2, 'key2');
    expect(container.get('1')).toBe('value1');
    expect(container.get('2')).toBe('value2');
  });
});

describe('toServiceIdentifier', () => {
  it('should return a function that generates a Symbol with the given prefix and key', () => {
    const serviceIdentifier = toServiceIdentifier<{ c: string }>('a', 'b');

    expect(serviceIdentifier).toBeInstanceOf(Function);
    expect(serviceIdentifier('c')).toBe(Symbol.for('a.b.c'));
  });
});
