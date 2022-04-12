/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ContextContainer } from './context';
import { PluginOpaqueId } from '../..';
import { httpServerMock } from '../../http/http_server.mocks';

const pluginA = Symbol('pluginA');
const pluginB = Symbol('pluginB');
const pluginC = Symbol('pluginC');
const pluginD = Symbol('pluginD');
const plugins: ReadonlyMap<PluginOpaqueId, PluginOpaqueId[]> = new Map([
  [pluginA, []],
  [pluginB, [pluginA]],
  [pluginC, [pluginA, pluginB]],
  [pluginD, []],
]);
const coreId = Symbol();

interface MyContext {
  core: any;
  core1: string;
  core2: number;
  ctxFromA: string;
  ctxFromB: number;
  ctxFromC: boolean;
  ctxFromD: object;
}

describe('ContextContainer', () => {
  it('does not allow the same context to be registered twice', () => {
    const contextContainer = new ContextContainer(plugins, coreId);
    contextContainer.registerContext<{ ctxFromA: string; core: any }, 'ctxFromA'>(
      coreId,
      'ctxFromA',
      () => 'aString'
    );

    expect(() =>
      contextContainer.registerContext<{ ctxFromA: string; core: any }, 'ctxFromA'>(
        coreId,
        'ctxFromA',
        () => 'aString'
      )
    ).toThrowErrorMatchingInlineSnapshot(
      `"Context provider for ctxFromA has already been registered."`
    );
  });

  describe('registerContext', () => {
    it('throws error if called with an unknown symbol', async () => {
      const contextContainer = new ContextContainer(plugins, coreId);
      await expect(() =>
        contextContainer.registerContext<{ ctxFromA: string; core: any }, 'ctxFromA'>(
          Symbol('unknown'),
          'ctxFromA',
          jest.fn()
        )
      ).toThrowErrorMatchingInlineSnapshot(
        `"Cannot register context for unknown plugin: Symbol(unknown)"`
      );
    });

    it('reports a TS error if returned contract does not satisfy the Context interface', async () => {
      const contextContainer = new ContextContainer(plugins, coreId);
      await expect(() =>
        contextContainer.registerContext<{ ctxFromA: string; core: any }, 'ctxFromA'>(
          pluginA,
          'ctxFromA',
          // @ts-expect-error expected string, returned number
          async () => 1
        )
      ).not.toThrow();
    });

    it('reports a TS error if registers a context for unknown property name', async () => {
      const contextContainer = new ContextContainer(plugins, coreId);
      await expect(() =>
        // @ts-expect-error expects ctxFromB, but given ctxFromC
        contextContainer.registerContext<{ ctxFromB: string; core: any }, 'ctxFromC'>(
          pluginB,
          'ctxFromC',
          async () => 1
        )
      ).not.toThrow();
    });
  });

  describe('context building', () => {
    it('lazily loads the providers when accessed', async () => {
      const contextContainer = new ContextContainer(plugins, coreId);

      const core1provider = jest.fn().mockReturnValue('core1');
      const ctxFromAProvider = jest.fn().mockReturnValue('ctxFromA');

      contextContainer.registerContext<{ core1: string; core: any }, 'core1'>(
        coreId,
        'core1',
        core1provider
      );

      contextContainer.registerContext<{ ctxFromA: string; core: any }, 'ctxFromA'>(
        pluginA,
        'ctxFromA',
        ctxFromAProvider
      );

      let context: any;
      const rawHandler1 = jest.fn((ctx) => {
        context = ctx;
        return 'rawHandler1' as any;
      });
      const handler1 = contextContainer.createHandler(pluginC, rawHandler1);

      const request = httpServerMock.createKibanaRequest();
      const response = httpServerMock.createResponseFactory();
      await handler1(request, response);

      expect(core1provider).not.toHaveBeenCalled();
      expect(ctxFromAProvider).not.toHaveBeenCalled();

      await context!.core1;

      expect(core1provider).toHaveBeenCalledTimes(1);
      expect(ctxFromAProvider).not.toHaveBeenCalled();

      await context!.ctxFromA;

      expect(core1provider).toHaveBeenCalledTimes(1);
      expect(ctxFromAProvider).toHaveBeenCalledTimes(1);
    });

    it(`does not eagerly loads a provider's dependencies`, async () => {
      const contextContainer = new ContextContainer(plugins, coreId);

      const core1provider = jest.fn().mockReturnValue('core1');
      const ctxFromAProvider = jest.fn().mockReturnValue('ctxFromA');

      contextContainer.registerContext<{ core1: string; core: any }, 'core1'>(
        coreId,
        'core1',
        core1provider
      );

      contextContainer.registerContext<{ ctxFromA: string; core: any }, 'ctxFromA'>(
        pluginA,
        'ctxFromA',
        ctxFromAProvider
      );

      let context: any;
      const rawHandler1 = jest.fn((ctx) => {
        context = ctx;
        return 'rawHandler1' as any;
      });
      const handler1 = contextContainer.createHandler(pluginC, rawHandler1);

      const request = httpServerMock.createKibanaRequest();
      const response = httpServerMock.createResponseFactory();
      await handler1(request, response);

      expect(core1provider).not.toHaveBeenCalled();
      expect(ctxFromAProvider).not.toHaveBeenCalled();

      await context!.ctxFromA;

      expect(core1provider).not.toHaveBeenCalled();
      expect(ctxFromAProvider).toHaveBeenCalledTimes(1);
    });

    it(`allows to load a dependency from a provider`, async () => {
      const contextContainer = new ContextContainer(plugins, coreId);

      const core1provider = jest.fn().mockReturnValue('core1');
      const ctxFromAProvider = jest.fn().mockImplementation(async (ctx: any) => {
        const core1 = await ctx.core1;
        return `${core1}-ctxFromA`;
      });

      contextContainer.registerContext<{ core1: string; core: any }, 'core1'>(
        coreId,
        'core1',
        core1provider
      );

      contextContainer.registerContext<{ ctxFromA: string; core: any }, 'ctxFromA'>(
        pluginA,
        'ctxFromA',
        ctxFromAProvider
      );

      let context: any;
      const rawHandler1 = jest.fn((ctx) => {
        context = ctx;
        return 'rawHandler1' as any;
      });
      const handler1 = contextContainer.createHandler(pluginC, rawHandler1);

      const request = httpServerMock.createKibanaRequest();
      const response = httpServerMock.createResponseFactory();
      await handler1(request, response);

      expect(core1provider).not.toHaveBeenCalled();
      expect(ctxFromAProvider).not.toHaveBeenCalled();

      const contextValue = await context!.ctxFromA;

      expect(contextValue).toEqual('core1-ctxFromA');
      expect(core1provider).toHaveBeenCalledTimes(1);
      expect(ctxFromAProvider).toHaveBeenCalledTimes(1);
    });

    it(`only calls a provider once and caches the returned value`, async () => {
      const contextContainer = new ContextContainer(plugins, coreId);

      const core1provider = jest.fn().mockReturnValue('core1');
      const ctxFromAProvider = jest.fn().mockImplementation(async (ctx: any) => {
        const core1 = await ctx.core1;
        return `${core1}-ctxFromA`;
      });

      contextContainer.registerContext<{ core1: string; core: any }, 'core1'>(
        coreId,
        'core1',
        core1provider
      );

      contextContainer.registerContext<{ ctxFromA: string; core: any }, 'ctxFromA'>(
        pluginA,
        'ctxFromA',
        ctxFromAProvider
      );

      let context: any;
      const rawHandler1 = jest.fn((ctx) => {
        context = ctx;
        return 'rawHandler1' as any;
      });
      const handler1 = contextContainer.createHandler(pluginC, rawHandler1);

      const request = httpServerMock.createKibanaRequest();
      const response = httpServerMock.createResponseFactory();
      await handler1(request, response);

      expect(core1provider).not.toHaveBeenCalled();
      expect(ctxFromAProvider).not.toHaveBeenCalled();

      await context!.core1;
      await context!.ctxFromA;
      await context!.core1;

      expect(core1provider).toHaveBeenCalledTimes(1);
      expect(ctxFromAProvider).toHaveBeenCalledTimes(1);
    });

    it('resolves dependencies', async () => {
      const contextContainer = new ContextContainer(plugins, coreId);
      expect.assertions(8);
      contextContainer.registerContext<{ core1: string; core: any }, 'core1'>(
        coreId,
        'core1',
        (context) => {
          expect(context).toEqual({});
          return 'core';
        }
      );

      contextContainer.registerContext<{ ctxFromA: string; core: any }, 'ctxFromA'>(
        pluginA,
        'ctxFromA',
        (context) => {
          expect(context).toEqual({ core1: 'core' });
          return 'aString';
        }
      );
      contextContainer.registerContext<{ ctxFromB: number; core: any }, 'ctxFromB'>(
        pluginB,
        'ctxFromB',
        (context) => {
          expect(context).toEqual({ core1: 'core', ctxFromA: 'aString' });
          return 299;
        }
      );
      contextContainer.registerContext<{ ctxFromC: boolean; core: any }, 'ctxFromC'>(
        pluginC,
        'ctxFromC',
        (context) => {
          expect(context).toEqual({
            core1: 'core',
            ctxFromA: 'aString',
            ctxFromB: 299,
          });
          return false;
        }
      );
      contextContainer.registerContext<{ ctxFromD: {}; core: any }, 'ctxFromD'>(
        pluginD,
        'ctxFromD',
        (context) => {
          expect(context).toEqual({ core1: 'core' });
          return {};
        }
      );

      const rawHandler1 = jest.fn(() => 'handler1' as any);
      const handler1 = contextContainer.createHandler(pluginC, rawHandler1);

      const rawHandler2 = jest.fn(() => 'handler2' as any);
      const handler2 = contextContainer.createHandler(pluginD, rawHandler2);

      const request = httpServerMock.createKibanaRequest();
      const response = httpServerMock.createResponseFactory();

      await handler1(request, response);
      await handler2(request, response);

      // Should have context from pluginC, its deps, and core
      expect(rawHandler1).toHaveBeenCalledWith(
        {
          core1: 'core',
          ctxFromA: 'aString',
          ctxFromB: 299,
          ctxFromC: false,
        },
        request,
        response
      );

      // Should have context from pluginD, and core
      expect(rawHandler2).toHaveBeenCalledWith(
        {
          core1: 'core',
          ctxFromD: {},
        },
        request,
        response
      );
    });

    it('exposes all core context to all providers regardless of registration order', async () => {
      expect.assertions(4);

      const contextContainer = new ContextContainer(plugins, coreId);
      contextContainer
        .registerContext<MyContext, 'ctxFromA'>(pluginA, 'ctxFromA', (context) => {
          expect(context).toEqual({ core1: 'core', core2: 101 });
          return `aString ${context.core1} ${context.core2}`;
        })
        .registerContext<MyContext, 'core1'>(coreId, 'core1', () => 'core')
        .registerContext<MyContext, 'core2'>(coreId, 'core2', () => 101)
        .registerContext<MyContext, 'ctxFromB'>(pluginB, 'ctxFromB', (context) => {
          expect(context).toEqual({
            core1: 'core',
            core2: 101,
            ctxFromA: 'aString core 101',
          });
          return 277;
        });

      const rawHandler1 = jest.fn(() => 'handler1' as any);
      const handler1 = contextContainer.createHandler(pluginB, rawHandler1);

      const request = httpServerMock.createKibanaRequest();
      const response = httpServerMock.createResponseFactory();
      expect(await handler1(request, response)).toEqual('handler1');

      expect(rawHandler1).toHaveBeenCalledWith(
        {
          core1: 'core',
          core2: 101,
          ctxFromA: 'aString core 101',
          ctxFromB: 277,
        },
        request,
        response
      );
    });

    it('exposes all core context to core providers', async () => {
      expect.assertions(4);
      const contextContainer = new ContextContainer(plugins, coreId);

      contextContainer
        .registerContext<MyContext, 'core1'>(coreId, 'core1', (context) => {
          expect(context).toEqual({});
          return 'core';
        })
        .registerContext<MyContext, 'core2'>(coreId, 'core2', (context) => {
          expect(context).toEqual({ core1: 'core' });
          return 101;
        });

      const rawHandler1 = jest.fn(() => 'handler1' as any);
      const handler1 = contextContainer.createHandler(pluginA, rawHandler1);

      const request = httpServerMock.createKibanaRequest();
      const response = httpServerMock.createResponseFactory();
      expect(await handler1(request, response)).toEqual('handler1');

      // If no context is registered for pluginA, only core contexts should be exposed
      expect(rawHandler1).toHaveBeenCalledWith(
        {
          core1: 'core',
          core2: 101,
        },
        request,
        response
      );
    });

    it('does not expose plugin contexts to core handler', async () => {
      const contextContainer = new ContextContainer(plugins, coreId);

      contextContainer
        .registerContext<MyContext, 'core1'>(coreId, 'core1', (context) => 'core')
        .registerContext<MyContext, 'ctxFromA'>(pluginA, 'ctxFromA', (context) => 'aString');

      const rawHandler1 = jest.fn(() => 'handler1' as any);
      const handler1 = contextContainer.createHandler(coreId, rawHandler1);

      const request = httpServerMock.createKibanaRequest();
      const response = httpServerMock.createResponseFactory();
      expect(await handler1(request, response)).toEqual('handler1');
      // pluginA context should not be present in a core handler
      expect(rawHandler1).toHaveBeenCalledWith(
        {
          core1: 'core',
        },
        request,
        response
      );
    });

    it('passes additional arguments to providers', async () => {
      expect.assertions(6);
      const contextContainer = new ContextContainer(plugins, coreId);

      const request = httpServerMock.createKibanaRequest();
      const response = httpServerMock.createResponseFactory();
      contextContainer.registerContext<MyContext, 'core1'>(coreId, 'core1', (context, req, res) => {
        expect(req).toBe(request);
        expect(res).toBe(response);
        return 'core';
      });

      contextContainer.registerContext<MyContext, 'ctxFromB'>(
        pluginD,
        'ctxFromB',
        (context, req, res) => {
          expect(req).toBe(request);
          expect(res).toBe(response);
          return 77;
        }
      );

      const rawHandler1 = jest.fn(() => 'handler1' as any);
      const handler1 = contextContainer.createHandler(pluginD, rawHandler1);

      expect(await handler1(request, response)).toEqual('handler1');

      expect(rawHandler1).toHaveBeenCalledWith(
        {
          core1: 'core',
          ctxFromB: 77,
        },
        request,
        response
      );
    });
  });

  describe('createHandler', () => {
    it('throws error if called with an unknown symbol', async () => {
      const contextContainer = new ContextContainer(plugins, coreId);
      await expect(() =>
        contextContainer.createHandler(Symbol('unknown'), jest.fn())
      ).toThrowErrorMatchingInlineSnapshot(
        `"Cannot create handler for unknown plugin: Symbol(unknown)"`
      );
    });

    it('returns value from original handler', async () => {
      const contextContainer = new ContextContainer(plugins, coreId);
      const rawHandler1 = jest.fn(() => 'handler1' as any);
      const handler1 = contextContainer.createHandler(pluginA, rawHandler1);

      const request = httpServerMock.createKibanaRequest();
      const response = httpServerMock.createResponseFactory();
      expect(await handler1(request, response)).toEqual('handler1');
    });

    it('passes additional arguments to handlers', async () => {
      const contextContainer = new ContextContainer(plugins, coreId);

      const rawHandler1 = jest.fn(() => 'handler1' as any);
      const handler1 = contextContainer.createHandler(pluginA, rawHandler1);

      const request = httpServerMock.createKibanaRequest();
      const response = httpServerMock.createResponseFactory();
      await handler1(request, response);
      expect(rawHandler1).toHaveBeenCalledWith({}, request, response);
    });
  });
});
