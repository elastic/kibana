/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Container } from 'inversify';
import { InternalContainer } from './container';

describe('InternalContainer', () => {
  let container: InternalContainer;

  beforeEach(() => {
    container = new InternalContainer();
  });

  it('should bind the `InternalContainer` to itself', () => {
    expect(container.get(InternalContainer)).toBe(container);
  });

  it('should bind the `Container` to itself', () => {
    expect(container.get(Container)).toBe(container);
  });

  describe('createChild', () => {
    it('should create a child container', () => {
      const child = container.createChild();
      container.bind('something').toConstantValue('value');

      expect(child.get('something')).toBe('value');
    });
  });

  describe('parent', () => {
    it('should return undefined if there is no parent', () => {
      expect(container.parent).toBeUndefined();
    });

    it('should return the parent container', () => {
      const child = container.createChild();

      expect(child.parent).toBe(container);
    });
  });
});
