/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Container, inject, injectable } from 'inversify';
import { loggerMock } from '@kbn/logging-mocks';
import {
  createExtensionPoint,
  createToken,
  ExtensionService,
  KibanaContainerModule,
  type KibanaContainerModuleLoadOptions,
  Logger,
  OnExtensionsReady,
  Scope,
  type ScopedContainer,
  Setup,
  Start,
} from '@kbn/core-di';
import type { InternalCoreDiServiceSetup } from '../contracts';
import { CoreInjectionService } from '../service';
import { ExtensionContribution } from './extensions';
import { InternalCoreStart } from './lifecycle';
import { Global } from './plugin';

interface Greeter {
  greet(): string;
}

const Request = createToken<{ user: string }>('test.Request');
const ApplicationParameters = createToken<{ appId: string }>('test.ApplicationParameters');
const Greeter = createExtensionPoint<Greeter>('test.Greeter');
const RequestGreeter = createExtensionPoint<Greeter>('test.RequestGreeter');

const greetRequest = (request: { user: string }): Greeter => ({
  greet: () => `hello ${request.user}`,
});

const contributeRequestGreeter = ({ extensions }: KibanaContainerModuleLoadOptions) => {
  extensions.contribute(RequestGreeter).toResolvedValue(greetRequest, [Request]).inRequestScope();
};

@injectable()
class Welcome {
  constructor(@inject(ExtensionService) private readonly extensionService: ExtensionService) {}

  read(): string | undefined {
    return this.extensionService.get(RequestGreeter)?.greet();
  }
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('request-scoped extension contributions', () => {
  let service: CoreInjectionService;
  let getContainer: InternalCoreDiServiceSetup['getContainer'];

  beforeEach(() => {
    service = new CoreInjectionService();
    ({ getContainer } = service.setup());
  });

  function createPlugin(
    name: string,
    load: (options: KibanaContainerModuleLoadOptions) => void = () => {}
  ): Container {
    const id = Symbol(name);
    const plugin = getContainer(id);
    plugin.bind(InternalCoreStart('injection')).toConstantValue({
      fork: () => service.start().fork(id),
      getContainer: () => getContainer(id),
    });
    plugin.load(new KibanaContainerModule(load));

    return plugin;
  }

  function start(...plugins: Container[]): () => void {
    plugins.forEach((plugin) => plugin.get(Setup));
    const { ready } = service.start();
    plugins.forEach((plugin) => plugin.get(Start));

    return ready;
  }

  function startAndReady(...plugins: Container[]): void {
    start(...plugins)();
  }

  /** Opens a request scope the way the DI route handler does. */
  function openRequest(plugin: Container, user: string): ScopedContainer {
    const scope = plugin.get(Scope);
    scope.expose(Request).toConstantValue({ user });

    return scope;
  }

  describe('inside a request', () => {
    it('should build a contribution with the request of each request', () => {
      const provider = createPlugin('provider', contributeRequestGreeter);
      const consumer = createPlugin('consumer', ({ bind }) => {
        bind(Welcome).toSelf().inRequestScope();
      });
      startAndReady(provider, consumer);

      const alice = openRequest(consumer, 'alice');
      expect(alice.get(Welcome).read()).toBe('hello alice');
      alice.dispose();

      const bob = openRequest(consumer, 'bob');
      expect(bob.get(Welcome).read()).toBe('hello bob');
      bob.dispose();
    });

    it('should build a contribution for a route class the scope autobinds', async () => {
      const provider = createPlugin('provider', contributeRequestGreeter);
      const consumer = createPlugin('consumer');
      startAndReady(provider, consumer);

      const scope = openRequest(consumer, 'alice');
      const route = await scope.getAsync(Welcome, { autobind: true });

      expect(route.read()).toBe('hello alice');
    });

    it('should keep concurrent requests apart when lookups interleave', () => {
      const provider = createPlugin('provider', contributeRequestGreeter);
      const consumer = createPlugin('consumer', ({ bind }) => {
        bind(Welcome).toSelf().inRequestScope();
      });
      startAndReady(provider, consumer);

      const alice = openRequest(consumer, 'alice');
      const bob = openRequest(consumer, 'bob');
      const aliceService = alice.get(ExtensionService);
      const bobService = bob.get(ExtensionService);

      expect([
        aliceService.get(RequestGreeter)?.greet(),
        bobService.get(RequestGreeter)?.greet(),
        alice.get(Welcome).read(),
        bob.get(Welcome).read(),
        aliceService.get(RequestGreeter)?.greet(),
        bobService.get(RequestGreeter)?.greet(),
      ]).toEqual([
        'hello alice',
        'hello bob',
        'hello alice',
        'hello bob',
        'hello alice',
        'hello bob',
      ]);
    });

    it("should build the provider's own contribution when the provider reads its point", () => {
      const provider = createPlugin('provider', (options) => {
        contributeRequestGreeter(options);
        options.bind(Welcome).toSelf().inRequestScope();
      });
      startAndReady(provider);

      expect(openRequest(provider, 'alice').get(Welcome).read()).toBe('hello alice');
      expect(openRequest(provider, 'bob').get(Welcome).read()).toBe('hello bob');
    });

    it('should reach a contribution read by a request-scoped service of a third plugin', () => {
      const Relay = createToken<Welcome>('test.Relay');
      const provider = createPlugin('provider', contributeRequestGreeter);
      const relay = createPlugin('relay', ({ bind }) => {
        bind(Relay).to(Welcome).inRequestScope();
        bind(Global).toConstantValue(Relay);
      });
      const consumer = createPlugin('consumer', ({ bind }) => {
        bind(Welcome)
          .toResolvedValue((welcome) => welcome, [Relay])
          .inRequestScope();
      });
      startAndReady(provider, relay, consumer);

      const alice = openRequest(consumer, 'alice');
      const bob = openRequest(consumer, 'bob');

      expect(alice.get(Welcome).read()).toBe('hello alice');
      expect(bob.get(Welcome).read()).toBe('hello bob');
      expect(alice.get(Welcome).read()).toBe('hello alice');
    });

    it('should inject any value the request scope exposes', () => {
      const provider = createPlugin('provider', ({ extensions }) => {
        extensions
          .contribute(Greeter)
          .toResolvedValue(
            (request, { appId }) => ({ greet: () => `hello ${request.user} in ${appId}` }),
            [Request, ApplicationParameters]
          )
          .inRequestScope();
      });
      const consumer = createPlugin('consumer');
      startAndReady(provider, consumer);

      const scope = openRequest(consumer, 'alice');
      scope.expose(ApplicationParameters).toConstantValue({ appId: 'discover' });

      expect(scope.get(ExtensionService).get(Greeter)?.greet()).toBe('hello alice in discover');
    });

    it('should return the same constant contribution inside and outside requests', () => {
      const greeter = { greet: () => 'hello' };
      const provider = createPlugin('provider', ({ extensions }) => {
        extensions.contribute(Greeter).toConstantValue(greeter);
      });
      const consumer = createPlugin('consumer');
      startAndReady(provider, consumer);

      expect(consumer.get(ExtensionService).get(Greeter)).toBe(greeter);
      expect(openRequest(consumer, 'alice').get(ExtensionService).get(Greeter)).toBe(greeter);
      expect(openRequest(consumer, 'bob').get(ExtensionService).get(Greeter)).toBe(greeter);
    });

    it('should build a singleton contribution that needs no request only once', () => {
      const factory = jest.fn((): Greeter => ({ greet: () => 'hello' }));
      const provider = createPlugin('provider', ({ extensions }) => {
        extensions.contribute(Greeter).toResolvedValue(factory);
      });
      const consumer = createPlugin('consumer');
      startAndReady(provider, consumer);

      const outside = consumer.get(ExtensionService).get(Greeter);
      const alice = openRequest(consumer, 'alice').get(ExtensionService).get(Greeter);
      const bob = openRequest(consumer, 'bob').get(ExtensionService).get(Greeter);

      expect(alice).toBe(outside);
      expect(bob).toBe(outside);
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it('should throw naming the contributing plugins when the point has two contributions', () => {
      const provider1 = createPlugin('provider1', contributeRequestGreeter);
      const provider2 = createPlugin('provider2', contributeRequestGreeter);
      const consumer = createPlugin('consumer');
      startAndReady(provider1, provider2, consumer);

      const scope = openRequest(consumer, 'alice');

      expect(() => scope.get(ExtensionService).get(RequestGreeter)).toThrow(
        'Cannot get extension point "test.RequestGreeter" because it has 2 contributions, from plugins "provider1", "provider2". Use getAll or collect instead.'
      );
      expect(
        scope
          .get(ExtensionService)
          .getAll(RequestGreeter)
          .map(({ greet }) => greet())
      ).toEqual(['hello alice', 'hello alice']);
    });

    it('should throw before all plugins started', () => {
      const provider = createPlugin('provider', contributeRequestGreeter);
      const consumer = createPlugin('consumer');
      const ready = start(provider, consumer);
      const scope = openRequest(consumer, 'alice');

      expect(() => scope.get(ExtensionService).get(RequestGreeter)).toThrow(
        'Cannot resolve extension point "test.RequestGreeter" before all plugins started. Call it in an OnExtensionsReady hook, a request handler, or later.'
      );

      ready();
      expect(scope.get(ExtensionService).get(RequestGreeter)?.greet()).toBe('hello alice');
    });
  });

  describe('outside a request', () => {
    it('should throw naming the point and the plugin for a contribution that needs the request', () => {
      const provider = createPlugin('provider', (options) => {
        contributeRequestGreeter(options);
        options.extensions.contribute(Greeter).toConstantValue({ greet: () => 'hello' });
      });
      const consumer = createPlugin('consumer');
      startAndReady(provider, consumer);
      const extensionService = consumer.get(ExtensionService);

      expect(() => extensionService.get(RequestGreeter)).toThrow(
        /^Failed to build the "test.RequestGreeter" contribution from plugin "provider": /
      );
      expect(extensionService.get(Greeter)?.greet()).toBe('hello');
    });

    it('should throw in an OnExtensionsReady hook and in a classic container', () => {
      const results: string[] = [];
      const record = (extensionService: ExtensionService) => {
        try {
          results.push(extensionService.get(RequestGreeter)?.greet() ?? 'undefined');
        } catch {
          results.push('throws');
        }
      };
      const provider = createPlugin('provider', contributeRequestGreeter);
      const consumer = createPlugin('consumer', ({ bind }) => {
        bind(OnExtensionsReady).toResolvedValue(
          (extensionService) => () => record(extensionService),
          [ExtensionService]
        );
      });
      const classic = createPlugin('classic');
      const classicService = classic.get(ExtensionService);
      startAndReady(provider, consumer, classic);
      record(classicService);

      expect(results).toEqual(['throws', 'throws']);
    });

    it('should skip and log a collected contribution that needs the request and pass the others', () => {
      const handler = jest.fn();
      const logger = loggerMock.create();
      const owner = createPlugin('owner', ({ bind, extensions }) => {
        bind(Logger).toConstantValue(logger);
        extensions.collect(RequestGreeter, handler);
      });
      const contributor = createPlugin('contributor', (options) => {
        contributeRequestGreeter(options);
        options.extensions.contribute(RequestGreeter).toConstantValue({ greet: () => 'healthy' });
      });
      startAndReady(owner, contributor);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][1].greet()).toBe('healthy');
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringMatching(
          /^Skipped the "test.RequestGreeter" contribution from plugin "contributor" because it failed to build: /
        )
      );
    });
  });

  describe('scopes that outlive a request', () => {
    it('should keep the first request in a singleton contribution', () => {
      const provider = createPlugin('provider', ({ extensions }) => {
        extensions.contribute(RequestGreeter).toResolvedValue(greetRequest, [Request]);
      });
      const consumer = createPlugin('consumer');
      startAndReady(provider, consumer);

      expect(
        openRequest(consumer, 'alice').get(ExtensionService).get(RequestGreeter)?.greet()
      ).toBe('hello alice');
      expect(openRequest(consumer, 'bob').get(ExtensionService).get(RequestGreeter)?.greet()).toBe(
        'hello alice'
      );
    });

    it('should keep the first request in a singleton consumer but not in a request-scoped one', () => {
      const SingletonWelcome = createToken<Welcome>('test.SingletonWelcome');
      const provider = createPlugin('provider', contributeRequestGreeter);
      const consumer = createPlugin('consumer', ({ bind }) => {
        bind(SingletonWelcome).to(Welcome).inSingletonScope();
        bind(Welcome).toSelf().inRequestScope();
      });
      startAndReady(provider, consumer);

      const alice = openRequest(consumer, 'alice');
      const bob = openRequest(consumer, 'bob');

      expect(alice.get(SingletonWelcome).read()).toBe('hello alice');
      expect(bob.get(SingletonWelcome).read()).toBe('hello alice');
      expect(alice.get(Welcome).read()).toBe('hello alice');
      expect(bob.get(Welcome).read()).toBe('hello bob');
    });

    it('should throw in a singleton consumer once its first request is disposed', async () => {
      const SingletonWelcome = createToken<Welcome>('test.SingletonWelcome');
      const provider = createPlugin('provider', contributeRequestGreeter);
      const consumer = createPlugin('consumer', ({ bind }) => {
        bind(SingletonWelcome).to(Welcome).inSingletonScope();
      });
      startAndReady(provider, consumer);

      const alice = openRequest(consumer, 'alice');
      expect(alice.get(SingletonWelcome).read()).toBe('hello alice');
      alice.dispose();
      await flush();

      const bob = openRequest(consumer, 'bob');
      expect(() => bob.get(SingletonWelcome).read()).toThrow(
        /^Failed to build the "test.RequestGreeter" contribution from plugin "provider": /
      );
    });
  });

  describe('isolation', () => {
    const DirectGreeter = createToken<Greeter>('test.DirectGreeter');

    it('should keep the contribution reachable only through ExtensionService, inside and outside requests', () => {
      const provider = createPlugin('provider', ({ extensions }) => {
        extensions.contribute(Greeter).toResolvedValue(greetRequest, [Request]).inRequestScope();
      });
      const consumer = createPlugin('consumer', ({ bind }) => {
        bind(DirectGreeter)
          .toResolvedValue((greeter) => greeter, [Greeter])
          .inRequestScope();
      });
      startAndReady(provider, consumer);
      const [{ slot }] = provider.getAll(ExtensionContribution);
      const root = getContainer();
      const fork = service.start().fork();
      const scope = openRequest(consumer, 'alice');

      expect(scope.get(ExtensionService).get(Greeter)?.greet()).toBe('hello alice');
      expect(() => fork.get(ExtensionService).get(Greeter)).toThrow(/Failed to build/);

      for (const container of [consumer, scope]) {
        expect(() => container.get(Greeter)).toThrow(/No bindings found/);
        expect(() => container.get(DirectGreeter)).toThrow(/No bindings found/);
        expect(container.isBound(slot)).toBe(false);
        expect(container.isBound(ExtensionContribution)).toBe(false);
      }
      for (const container of [root, fork]) {
        expect(container.isBound(Greeter)).toBe(false);
        expect(container.isBound(slot)).toBe(false);
        expect(container.isBound(ExtensionContribution)).toBe(false);
      }
    });
  });

  describe('dispose', () => {
    it("should unbind the provider's request container and leave other requests alone", async () => {
      const containers: Container[] = [];
      const provider = createPlugin('provider', ({ extensions }) => {
        extensions
          .contribute(RequestGreeter)
          .toResolvedValue(
            (container, request) => {
              containers.push(container);

              return greetRequest(request);
            },
            [Container, Request]
          )
          .inRequestScope();
      });
      const consumer = createPlugin('consumer');
      startAndReady(provider, consumer);

      const alice = openRequest(consumer, 'alice');
      const bob = openRequest(consumer, 'bob');
      alice.get(ExtensionService).get(RequestGreeter);
      bob.get(ExtensionService).get(RequestGreeter);
      const [aliceProvider, bobProvider] = containers;

      expect(aliceProvider).not.toBe(provider);
      expect(aliceProvider).not.toBe(bobProvider);
      expect(aliceProvider.get(Request)).toEqual({ user: 'alice' });

      alice.dispose();
      await flush();

      expect(aliceProvider.isCurrentBound(Container)).toBe(false);
      expect(aliceProvider.isCurrentBound(Request)).toBe(false);
      expect(() => aliceProvider.get(Request)).toThrow(/No bindings found/);
      expect(bob.get(ExtensionService).get(RequestGreeter)?.greet()).toBe('hello bob');
      expect(bobProvider.get(Request)).toEqual({ user: 'bob' });

      const carol = openRequest(consumer, 'carol');
      expect(carol.get(ExtensionService).get(RequestGreeter)?.greet()).toBe('hello carol');
      expect(containers[containers.length - 1]).not.toBe(aliceProvider);
    });
  });
});
