/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Container, LazyServiceIdentifier, type ServiceIdentifier } from 'inversify';
import { createExtensionPoint } from './extension_point';
import { Logger } from './services/logging';
import { OnExtensionsReady, OnSetup, OnStart } from './services/plugin';
import { KibanaContainerModule, type KibanaContainerModuleLoadOptions } from './module';

type Hook = ServiceIdentifier<(container: Container) => void>;

function trigger(hook: Hook, container: Container): void {
  return container.getAll(hook, { chained: true, optional: true }).forEach((fn) => fn(container));
}

describe('KibanaContainerModule', () => {
  const token = Symbol.for('something');
  const dependencyToken = Symbol.for('dependency') as ServiceIdentifier<string>;
  const asyncDependencyToken = Symbol.for('async');
  const point = createExtensionPoint<string>('test.Point');
  const Collect = Symbol.for('core.di.Collect') as Hook;
  const Contributions = Symbol.for('core.di.Contributions') as ServiceIdentifier<
    (point: { id: string }) => Array<{ plugin: string; resolve(): unknown }>
  >;
  const ExtensionContribution = Symbol.for('core.di.ExtensionContribution') as ServiceIdentifier<{
    pointId: string;
    slot: ServiceIdentifier;
  }>;

  let container: Container;
  let options: KibanaContainerModuleLoadOptions;

  beforeEach(() => {
    container = new Container();
    container.load(
      new KibanaContainerModule((o) => {
        options = o;
      })
    );
    container.snapshot();
  });

  describe.each([
    { name: 'onSetup' as const, hook: OnSetup },
    { name: 'onStart' as const, hook: OnStart },
  ])('$name', ({ hook, name }) => {
    let handler: jest.Mock;

    beforeEach(() => {
      handler = jest.fn();
      options[name](token, handler);
      container.bind(dependencyToken).toConstantValue('something');
    });

    it('should bind to a lifecycle hook', () => {
      expect(container.isBound(hook)).toBe(true);
    });

    it('should not fail if there are no registered services', () => {
      expect(() => trigger(hook, container)).not.toThrow();
      expect(handler).not.toHaveBeenCalled();
    });

    it('should activate a bound service', () => {
      container.bind(token).toConstantValue('value');

      expect(() => trigger(hook, container)).not.toThrow();
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ get: expect.any(Function) }),
        'value'
      );
    });

    it('should activate multiple services', () => {
      container.bind(token).toConstantValue('value1');
      container.bind(token).toConstantValue('value2');

      expect(() => trigger(hook, container)).not.toThrow();
      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenNthCalledWith(1, expect.anything(), 'value1');
      expect(handler).toHaveBeenNthCalledWith(2, expect.anything(), 'value2');
    });

    it('should not invoke the registered handler when the service was resolved before', () => {
      container.bind(token).toConstantValue('value');
      container.get(token);

      expect(handler).not.toHaveBeenCalled();
      expect(() => trigger(hook, container)).not.toThrow();
      expect(handler).toHaveBeenCalled();
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
      container.restore();
      options[name](token, dependencyToken, handler);
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
      container.restore();
      options[name](token, dependency, handler);
      container.bind(token).toConstantValue('value');
      container.bind(dependencyToken).toConstantValue('something');

      expect(() => trigger(hook, container)).not.toThrow();
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ get: expect.any(Function) }),
        'value',
        expected
      );
    });
  });

  describe('onStart', () => {
    it('should invoke the registered handler on start only', () => {
      const onSetupHandler = jest.fn();
      const onStartHandler = jest.fn();

      options.onSetup(token, onSetupHandler);
      options.onStart(token, onStartHandler);
      container.bind(token).toConstantValue('value');

      trigger(OnSetup, container);
      expect(onSetupHandler).toHaveBeenCalledTimes(1);
      expect(onStartHandler).not.toHaveBeenCalled();

      trigger(OnStart, container);
      expect(onStartHandler).toHaveBeenCalledTimes(1);
    });

    it('should not throw when there are dependencies available after start', () => {
      const onStartHandler = jest.fn();
      const startDependency = Symbol.for('core.start.service');
      options.onSetup(token, jest.fn());
      options.onStart(token, startDependency, onStartHandler);
      container.bind(token).toConstantValue('value');

      expect(() => trigger(OnSetup, container)).not.toThrow();
      expect(onStartHandler).not.toHaveBeenCalled();

      container.bind(startDependency).toConstantValue('something');

      expect(() => trigger(OnStart, container)).not.toThrow();
      expect(onStartHandler).toHaveBeenCalledWith(expect.anything(), 'value', 'something');
    });
  });

  describe('extensions.contribute', () => {
    it('should record one contribution per call, each bound to its own private slot', () => {
      options.extensions.contribute(point).toConstantValue('value1');
      options.extensions.contribute(point).toConstantValue('value2');

      const records = container.getAll(ExtensionContribution);
      expect(records.map(({ pointId }) => pointId)).toEqual(['test.Point', 'test.Point']);
      expect(records.map(({ slot }) => container.get(slot))).toEqual(['value1', 'value2']);
    });

    it('should not bind the extension point id or any registered symbol', () => {
      options.extensions.contribute(point).toConstantValue('value');

      const [{ slot }] = container.getAll(ExtensionContribution);
      expect(typeof slot === 'symbol' && Symbol.keyFor(slot)).toBeUndefined();
      expect(container.isBound('test.Point')).toBe(false);
      expect(container.isBound(Symbol.for('test.Point'))).toBe(false);
    });
  });

  describe('extensions.collect', () => {
    let contributions: Array<() => string>;
    let logger: { error: jest.Mock };

    beforeEach(() => {
      contributions = [];
      logger = { error: jest.fn() };
      container
        .bind(Contributions)
        .toConstantValue(({ id }) =>
          id === point.id
            ? contributions.map((resolve) => ({ plugin: 'contributor', resolve }))
            : []
        );
      container.bind(dependencyToken).toConstantValue('something');
      container.bind(Logger as ServiceIdentifier).toConstantValue(logger);
    });

    it('should call the handler with every contribution only when its hook runs', () => {
      const handler = jest.fn();
      options.extensions.collect(point, dependencyToken, handler);
      contributions.push(
        () => 'value1',
        () => 'value2'
      );

      trigger(OnSetup, container);
      trigger(OnStart, container);
      trigger(OnExtensionsReady, container);
      expect(handler).not.toHaveBeenCalled();

      trigger(Collect, container);
      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenNthCalledWith(1, expect.anything(), 'value1', 'something');
      expect(handler).toHaveBeenNthCalledWith(2, expect.anything(), 'value2', 'something');
    });

    it('should skip and log a contribution that fails to build and pass the others', () => {
      const handler = jest.fn();
      options.extensions.collect(point, handler);
      contributions.push(
        () => {
          throw new Error('boom');
        },
        () => 'healthy'
      );

      trigger(Collect, container);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(expect.anything(), 'healthy');
      expect(logger.error).toHaveBeenCalledWith(
        'Skipped the "test.Point" contribution from plugin "contributor" because it failed to build: boom'
      );
    });

    it('should not call the handler when nothing is contributed', () => {
      const handler = jest.fn();
      options.extensions.collect(point, handler);

      expect(() => trigger(Collect, container)).not.toThrow();
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('inject', () => {
    it('should not resolve dependencies until Kibana is started', async () => {
      const factory = jest.fn(() => 'something');

      options.bind(dependencyToken).toResolvedValue(factory);
      options
        .bind(token)
        .toDynamicValue(options.inject(dependencyToken, (dependency) => `value:${dependency}`));

      const promise = container.getAsync(token);
      await new Promise(process.nextTick);

      expect(factory).not.toHaveBeenCalled();
      expect(() => trigger(OnStart, container)).not.toThrow();
      await new Promise(process.nextTick);

      expect(factory).toHaveBeenCalled();
      await expect(promise).resolves.toBe('value:something');
    });

    it('should resolve dependencies in the current context', async () => {
      options
        .bind(token)
        .toDynamicValue(options.inject(dependencyToken, (dependency) => `value:${dependency}`));

      const child = new Container({ parent: container });
      child.bind(dependencyToken).toConstantValue('something');

      expect(() => trigger(OnStart, container)).not.toThrow();
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
      options.bind(dependencyToken).toConstantValue('something');
      options.bind(asyncDependencyToken).toConstantValue(Promise.resolve('async'));
      options.bind(token).toDynamicValue(options.inject(dependency, (value) => value));

      expect(() => trigger(OnStart, container)).not.toThrow();
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

        options.onSetup(token, ({ inject }) =>
          inject(dependencyToken, (value) => {
            resolved = value as string;
          })()
        );
        child.bind(token).toConstantValue('value');

        expect(() => trigger(OnSetup, child)).not.toThrow();
        expect(() => trigger(OnStart, child)).not.toThrow();
        await new Promise(process.nextTick);
        expect(resolved).toBe('something');
      });

      it('should inject in the `onActivation` context', async () => {
        options.bind(token).toConstantValue('value');
        options.onActivation(token, ({ inject }) => inject(dependencyToken, (value) => value)());

        expect(() => trigger(OnSetup, child)).not.toThrow();
        expect(() => trigger(OnStart, child)).not.toThrow();
        await new Promise(process.nextTick);
        await expect(child.getAsync(token)).resolves.toBe('something');
      });

      it('should inject in the `toDynamicValue` context', async () => {
        options
          .bind(token)
          .toDynamicValue(({ inject }) => inject(dependencyToken, (value) => value)());

        expect(() => trigger(OnSetup, child)).not.toThrow();
        expect(() => trigger(OnStart, child)).not.toThrow();
        await new Promise(process.nextTick);
        await expect(child.getAsync(token)).resolves.toBe('something');
      });

      it('should inject in the `toFactory` context', async () => {
        options
          .bind(token as ServiceIdentifier<() => string>)
          .toFactory(({ inject }) => inject(dependencyToken, (value) => jest.fn(() => value))());

        expect(() => trigger(OnSetup, child)).not.toThrow();
        expect(() => trigger(OnStart, child)).not.toThrow();
        await new Promise(process.nextTick);
        const factory = child.getAsync(token);
        await expect(factory).resolves.not.toThrow();
        await expect(factory).resolves.toHaveReturnedWith('something');
      });
    });
  });
});
