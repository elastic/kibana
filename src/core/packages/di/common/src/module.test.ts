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
  const token = Symbol.for('something');
  const dependencyToken = Symbol.for('dependency');
  const asyncDependencyToken = Symbol.for('async');

  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  function trigger(hook: typeof OnSetup | typeof OnStart, context = container): void {
    return context.getAll(hook, { chained: true }).forEach((fn) => fn(context));
  }

  describe('bind', () => {
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
        expect(() => trigger(hook)).not.toThrow();
        expect(handler).not.toHaveBeenCalled();
      });

      it('should activate a bound service', () => {
        container.bind(token).toConstantValue('value');

        expect(() => trigger(hook)).not.toThrow();
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({ get: expect.any(Function) }),
          'value'
        );
      });

      it('should activate multiple services', () => {
        container.bind(token).toConstantValue('value1');
        container.bind(token).toConstantValue('value2');

        expect(() => trigger(hook)).not.toThrow();
        expect(handler).toHaveBeenCalledTimes(2);
        expect(handler).toHaveBeenNthCalledWith(1, expect.anything(), 'value1');
        expect(handler).toHaveBeenNthCalledWith(2, expect.anything(), 'value2');
      });

      it('should activate only in the current context', () => {
        container.bind(token).toConstantValue('value1');

        const child = new Container({ parent: container });
        child.bind(token).toConstantValue('value2');

        expect(() => trigger(hook, child)).not.toThrow();
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({ get: expect.any(Function) }),
          'value2'
        );
      });

      it('should not activate in the parent context', () => {
        container.bind(token).toConstantValue('value');

        const child = new Container({ parent: container });

        expect(() => trigger(hook, child)).not.toThrow();
        expect(handler).not.toHaveBeenCalled();
      });

      it('should provide a dependency in the current context', () => {
        container.unload(module);
        container.load(
          new KibanaContainerModule(({ bind }) => {
            bind(token)[name](handler, dependencyToken);
          })
        );
        container.bind(dependencyToken).toConstantValue('something');

        const child = new Container({ parent: container });
        child.bind(dependencyToken).toConstantValue('overridden');
        child.bind(token).toConstantValue('value2');

        expect(() => trigger(hook, child)).not.toThrow();
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({ get: expect.any(Function) }),
          'value2',
          'overridden'
        );
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

        expect(() => trigger(hook)).not.toThrow();
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({ get: expect.any(Function) }),
          'value',
          expected
        );
      });
    });
  });

  describe('inject', () => {
    it('should not resolve dependencies until Kibana is started', async () => {
      const factory = jest.fn(() => 'something');

      container.load(
        new KibanaContainerModule(({ bind, inject }) => {
          bind(dependencyToken).toResolvedValue(factory);
          bind(token).toDynamicValue(
            inject(dependencyToken, (dependency) => `value:${dependency}`)
          );
        })
      );

      const promise = container.getAsync(token);
      await new Promise(process.nextTick);

      expect(factory).not.toHaveBeenCalled();
      expect(() => trigger(OnStart)).not.toThrow();
      await new Promise(process.nextTick);

      expect(factory).toHaveBeenCalled();
      await expect(promise).resolves.toBe('value:something');
    });

    it('should resolve dependencies in the current context', async () => {
      container.load(
        new KibanaContainerModule(({ bind, inject }) => {
          bind(token).toDynamicValue(
            inject(dependencyToken, (dependency) => `value:${dependency}`)
          );
        })
      );

      const child = new Container({ parent: container });
      child.bind(dependencyToken).toConstantValue('something');

      expect(() => trigger(OnStart)).not.toThrow();
      await expect(child.getAsync(token)).resolves.toBe('value:something');
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
      {
        dependency: asyncDependencyToken,
        expected: 'async',
        kind: 'an asynchronous ',
      },
    ])('should inject when dependency is $kind', async ({ dependency, expected }) => {
      container.load(
        new KibanaContainerModule(({ bind, inject }) => {
          bind(dependencyToken).toConstantValue('something');
          bind(asyncDependencyToken).toConstantValue(Promise.resolve('async'));
          bind(token).toDynamicValue(inject(dependency, (value) => value));
        })
      );

      expect(() => trigger(OnStart)).not.toThrow();
      await expect(container.getAsync(token)).resolves.toEqual(expected);
    });

    describe('when context is bound', () => {
      let child: Container;

      beforeEach(() => {
        child = new Container({ parent: container });
        child.bind(dependencyToken).toConstantValue('something');
      });

      it('onSetup', async () => {
        let resolved: string | undefined;

        container.load(
          new KibanaContainerModule(({ bind }) => {
            bind(token).onSetup(({ inject }) =>
              inject(dependencyToken, (value) => {
                resolved = value as string;
              })()
            );
          })
        );
        child.bind(token).toConstantValue('value');

        expect(() => trigger(OnSetup, child)).not.toThrow();
        expect(() => trigger(OnStart, child)).not.toThrow();
        await new Promise(process.nextTick);
        expect(resolved).toBe('something');
      });
    });
  });
});
