/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { SavedObjectDecoratorRegistry } from './registry';

const mockDecorator = (id: string = 'foo') => {
  return {
    getId: () => id,
    decorateConfig: () => undefined,
    decorateObject: () => undefined,
  };
};

describe('SavedObjectDecoratorRegistry', () => {
  let registry: SavedObjectDecoratorRegistry;

  beforeEach(() => {
    registry = new SavedObjectDecoratorRegistry();
  });

  describe('register', () => {
    it('allow to register a decorator', () => {
      expect(() => {
        registry.register({
          id: 'foo',
          priority: 9000,
          factory: () => mockDecorator(),
        });
      }).not.toThrow();
    });

    it('throws when trying to register the same id twice', () => {
      registry.register({
        id: 'foo',
        priority: 9000,
        factory: () => mockDecorator(),
      });

      expect(() => {
        registry.register({
          id: 'foo',
          priority: 42,
          factory: () => mockDecorator(),
        });
      }).toThrowErrorMatchingInlineSnapshot(`"A decorator is already registered for id foo"`);
    });

    it('throws when trying to register multiple decorators with the same priority', () => {
      registry.register({
        id: 'foo',
        priority: 100,
        factory: () => mockDecorator(),
      });

      expect(() => {
        registry.register({
          id: 'bar',
          priority: 100,
          factory: () => mockDecorator(),
        });
      }).toThrowErrorMatchingInlineSnapshot(`"A decorator is already registered for priority 100"`);
    });
  });

  describe('getOrderedDecorators', () => {
    it('returns the decorators in correct order', () => {
      registry.register({
        id: 'A',
        priority: 1000,
        factory: () => mockDecorator('A'),
      });
      registry.register({
        id: 'B',
        priority: 100,
        factory: () => mockDecorator('B'),
      });
      registry.register({
        id: 'C',
        priority: 2000,
        factory: () => mockDecorator('C'),
      });

      const decorators = registry.getOrderedDecorators({} as any);
      expect(decorators.map((d) => d.getId())).toEqual(['B', 'A', 'C']);
    });

    it('invoke the decorators factory with the provided services', () => {
      const services = Symbol('services');

      const decorator = {
        id: 'foo',
        priority: 9000,
        factory: jest.fn(),
      };
      registry.register(decorator);
      registry.getOrderedDecorators(services as any);

      expect(decorator.factory).toHaveBeenCalledTimes(1);
      expect(decorator.factory).toHaveBeenCalledWith(services);
    });

    it('invoke the factory each time the method is called', () => {
      const services = Symbol('services');

      const decorator = {
        id: 'foo',
        priority: 9000,
        factory: jest.fn(),
      };
      registry.register(decorator);
      registry.getOrderedDecorators(services as any);

      expect(decorator.factory).toHaveBeenCalledTimes(1);

      registry.getOrderedDecorators(services as any);

      expect(decorator.factory).toHaveBeenCalledTimes(2);
    });
  });
});
