/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Container, LazyServiceIdentifier } from 'inversify';
import { KibanaContainerModule } from './module';
import { OnSetup, OnStart } from './services/plugin';

describe('KibanaContainerModule', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  describe('bind', () => {
    const token = Symbol.for('something');
    const dependencyToken = Symbol.for('dependency');

    describe.each([
      { name: 'onSetup' as const, hook: OnSetup },
      { name: 'onStart' as const, hook: OnStart },
    ])('$name', ({ hook, name }) => {
      let handler: jest.Mock;
      let module: KibanaContainerModule;

      beforeEach(() => {
        handler = jest.fn();
        module = new KibanaContainerModule(({ bind }) => {
          bind(token)[name](handler);
        });

        container.bind(dependencyToken).toConstantValue('something');
        container.load(module);
      });

      it('should bind to a lifecycle hook', () => {
        expect(container.isBound(hook)).toBe(true);
      });

      it('should not fail if there are no registered services', () => {
        expect(() => container.get(hook)(container)).not.toThrow();
        expect(handler).not.toHaveBeenCalled();
      });

      it('should activate a bound service', () => {
        container.bind(token).toConstantValue('value');

        expect(() => container.get(hook)(container)).not.toThrow();
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({ get: expect.any(Function) }),
          'value'
        );
      });

      it('should activate multiple services', () => {
        container.bind(token).toConstantValue('value1');
        container.bind(token).toConstantValue('value2');

        expect(() => container.get(hook)(container)).not.toThrow();
        expect(handler).toHaveBeenCalledTimes(2);
        expect(handler).toHaveBeenNthCalledWith(1, expect.anything(), 'value1');
        expect(handler).toHaveBeenNthCalledWith(2, expect.anything(), 'value2');
      });

      it.each([
        {
          dependency: dependencyToken,
          expected: 'something',
          kind: 'a service identifier',
        },
        {
          dependency: { serviceIdentifier: dependencyToken, isMultiple: true },
          expected: ['something'],
          kind: 'a multi service identifier',
        },
        {
          dependency: new LazyServiceIdentifier(() => dependencyToken),
          expected: 'something',
          kind: 'a lazy service identifier',
        },
        {
          dependency: {
            serviceIdentifier: new LazyServiceIdentifier(() => dependencyToken),
          },
          expected: 'something',
          kind: 'a lazy service identifier in inject options',
        },
        {
          dependency: { serviceIdentifier: 'optional', optional: true },
          expected: undefined,
          kind: 'an optional service identifier',
        },
      ])('should provide a dependency when injected as $kind', ({ dependency, expected }) => {
        container.unload(module);
        container.load(
          new KibanaContainerModule(({ bind }) => {
            bind(token)[name](handler, dependency);
          })
        );
        container.bind(token).toConstantValue('value');

        expect(() => container.get(hook)(container)).not.toThrow();
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({ get: expect.any(Function) }),
          'value',
          expected
        );
      });
    });
  });
});
