/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Container, LazyServiceIdentifier, type ServiceIdentifier } from 'inversify';
import { injectionServiceMock, setup, start } from '@kbn/core-di-mocks';
import { KibanaContainerModule } from './module';
import { OnSetup, OnStart } from './services/plugin';

describe('KibanaContainerModule', () => {
  const token = Symbol.for('something');
  const dependencyToken = Symbol.for('dependency') as ServiceIdentifier<string>;
  const asyncDependencyToken = Symbol.for('async');

  let container: Container;

  beforeEach(() => {
    container = injectionServiceMock.createSetupContract().getContainer();
  });

  describe.each([
    { name: 'onSetup' as const, hook: OnSetup, trigger: setup },
    { name: 'onStart' as const, hook: OnStart, trigger: start },
  ])('$name', ({ hook, name, trigger }) => {
    let handler: jest.Mock;
    let module: KibanaContainerModule;

    beforeEach(() => {
      handler = jest.fn();
      module = new KibanaContainerModule(({ [name]: onHook }) => {
        onHook(token, handler);
      });

      container.bind(dependencyToken).toConstantValue('something');
      container.load(module);
    });

    it('should bind to a lifecycle hook', () => {
      expect(container.isBound(hook)).toBe(true);
    });

    it('should not fail if there are no registered services', () => {
      expect(() => trigger(container)).not.toThrow();
      expect(handler).not.toHaveBeenCalled();
    });

    it('should activate a bound service', () => {
      container.bind(token).toConstantValue('value');

      expect(() => trigger(container)).not.toThrow();
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ get: expect.any(Function) }),
        'value'
      );
    });

    it('should activate multiple services', () => {
      container.bind(token).toConstantValue('value1');
      container.bind(token).toConstantValue('value2');

      expect(() => trigger(container)).not.toThrow();
      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenNthCalledWith(1, expect.anything(), 'value1');
      expect(handler).toHaveBeenNthCalledWith(2, expect.anything(), 'value2');
    });

    it('should activate only in the current context', () => {
      container.bind(token).toConstantValue('value1');

      const child = new Container({ parent: container });
      child.bind(token).toConstantValue('value2');

      expect(() => trigger(child)).not.toThrow();
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ get: expect.any(Function) }),
        'value2'
      );
    });

    it('should not activate in the parent context', () => {
      container.bind(token).toConstantValue('value');

      const child = new Container({ parent: container });

      expect(() => trigger(child)).not.toThrow();
      expect(handler).not.toHaveBeenCalled();
    });

    it('should provide a dependency in the current context', () => {
      container.unload(module);
      container.load(
        new KibanaContainerModule(({ [name]: onHook }) => {
          onHook(token, dependencyToken, handler);
        })
      );
      container.bind(dependencyToken).toConstantValue('something');

      const child = new Container({ parent: container });
      child.bind(dependencyToken).toConstantValue('overridden');
      child.bind(token).toConstantValue('value2');

      expect(() => trigger(child)).not.toThrow();
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
        new KibanaContainerModule(({ [name]: onHook }) => {
          onHook(token, dependency, handler);
        })
      );
      container.bind(token).toConstantValue('value');

      expect(() => trigger(container)).not.toThrow();
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ get: expect.any(Function) }),
        'value',
        expected
      );
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
      expect(() => start(container)).not.toThrow();
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

      expect(() => start(container)).not.toThrow();
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

      expect(() => start(container)).not.toThrow();
      await expect(container.getAsync(token)).resolves.toEqual(expected);
    });

    describe('when context is bound', () => {
      let child: Container;

      beforeEach(() => {
        child = new Container({ parent: container });
        child.bind(dependencyToken).toConstantValue('something');
      });

      it('should inject in the `onSetup` context', async () => {
        let resolved: string | undefined;

        container.load(
          new KibanaContainerModule(({ onSetup }) => {
            onSetup(token, ({ inject }) =>
              inject(dependencyToken, (value) => {
                resolved = value as string;
              })()
            );
          })
        );
        child.bind(token).toConstantValue('value');

        expect(() => setup(child)).not.toThrow();
        expect(() => start(child)).not.toThrow();
        await new Promise(process.nextTick);
        expect(resolved).toBe('something');
      });

      it('should inject in the `onActivation` context', async () => {
        container.load(
          new KibanaContainerModule(({ bind, onActivation }) => {
            bind(token).toConstantValue('value');
            onActivation(token, ({ inject }) => inject(dependencyToken, (value) => value)());
          })
        );

        expect(() => setup(child)).not.toThrow();
        expect(() => start(child)).not.toThrow();
        await new Promise(process.nextTick);
        await expect(child.getAsync(token)).resolves.toBe('something');
      });

      it('should inject in the `toDynamicValue` context', async () => {
        container.load(
          new KibanaContainerModule(({ bind }) => {
            bind(token).toDynamicValue(({ inject }) => inject(dependencyToken, (value) => value)());
          })
        );

        expect(() => setup(child)).not.toThrow();
        expect(() => start(child)).not.toThrow();
        await new Promise(process.nextTick);
        await expect(child.getAsync(token)).resolves.toBe('something');
      });

      it('should inject in the `toFactory` context', async () => {
        container.load(
          new KibanaContainerModule(({ bind }) => {
            bind(token as ServiceIdentifier<() => string>).toFactory(({ inject }) =>
              inject(dependencyToken, (value) => jest.fn(() => value))()
            );
          })
        );

        expect(() => setup(child)).not.toThrow();
        expect(() => start(child)).not.toThrow();
        await new Promise(process.nextTick);
        const factory = child.getAsync(token);
        await expect(factory).resolves.not.toThrow();
        await expect(factory).resolves.toHaveReturnedWith('something');
      });
    });
  });
});
