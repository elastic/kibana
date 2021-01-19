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

describe('ContextContainer', () => {
  it('does not allow the same context to be registered twice', () => {
    const contextContainer = new ContextContainer(plugins, coreId);
    contextContainer.registerContext(coreId, 'ctxFromA', () => ({ aString: 'aString' }));

    expect(() =>
      contextContainer.registerContext(coreId, 'ctxFromA', () => ({ aString: 'aString' }))
    ).toThrowErrorMatchingInlineSnapshot(
      `"Context provider for ctxFromA has already been registered."`
    );
  });

  describe('registerContext', () => {
    it('throws error if called with an unknown symbol', async () => {
      const contextContainer = new ContextContainer(plugins, coreId);
      await expect(() =>
        contextContainer.registerContext(Symbol('unknown'), 'ctxFromA', jest.fn())
      ).toThrowErrorMatchingInlineSnapshot(
        `"Cannot register context for unknown plugin: Symbol(unknown)"`
      );
    });
  });

  describe('context building', () => {
    it('resolves dependencies', async () => {
      const contextContainer = new ContextContainer(plugins, coreId);
      expect.assertions(8);
      contextContainer.registerContext(coreId, 'core1', (context) => {
        expect(context).toEqual({});
        return { value: 'core' };
      });

      contextContainer.registerContext(pluginA, 'ctxFromA', (context) => {
        expect(context).toEqual({ core1: { value: 'core' } });
        return { value: 'aString' };
      });
      contextContainer.registerContext(pluginB, 'ctxFromB', (context) => {
        expect(context).toEqual({ core1: { value: 'core' }, ctxFromA: { value: 'aString' } });
        return { value: 299 };
      });
      contextContainer.registerContext(pluginC, 'ctxFromC', (context) => {
        expect(context).toEqual({
          core1: { value: 'core' },
          ctxFromA: { value: 'aString' },
          ctxFromB: { value: 299 },
        });
        return { value: false };
      });
      contextContainer.registerContext(pluginD, 'ctxFromD', (context) => {
        expect(context).toEqual({ core1: { value: 'core' } });
        return { value: {} };
      });

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
          core1: { value: 'core' },
          ctxFromA: { value: 'aString' },
          ctxFromB: { value: 299 },
          ctxFromC: { value: false },
        },
        request,
        response
      );

      // Should have context from pluginD, and core
      expect(rawHandler2).toHaveBeenCalledWith(
        {
          core1: { value: 'core' },
          ctxFromD: { value: {} },
        },
        request,
        response
      );
    });

    it('exposes all core context to all providers regardless of registration order', async () => {
      expect.assertions(4);

      const contextContainer = new ContextContainer(plugins, coreId);
      contextContainer
        .registerContext<
          { ctxFromA: string },
          { core1: { value: string }; core2: { value: string }; core: any }
        >(pluginA, 'ctxFromA', (context) => {
          expect(context).toEqual({ core1: { value: 'core' }, core2: { value: 101 } });
          return { ctxFromA: `aString ${context.core1.value} ${context.core2.value}` };
        })
        .registerContext(coreId, 'core1', () => ({ value: 'core' }))
        .registerContext(coreId, 'core2', () => ({ value: 101 }))
        .registerContext(pluginB, 'ctxFromB', (context) => {
          expect(context).toEqual({
            core1: { value: 'core' },
            core2: { value: 101 },
            ctxFromA: { ctxFromA: 'aString core 101' },
          });
          return { value: 277 };
        });

      const rawHandler1 = jest.fn(() => 'handler1' as any);
      const handler1 = contextContainer.createHandler(pluginB, rawHandler1);

      const request = httpServerMock.createKibanaRequest();
      const response = httpServerMock.createResponseFactory();
      expect(await handler1(request, response)).toEqual('handler1');

      expect(rawHandler1).toHaveBeenCalledWith(
        {
          core1: { value: 'core' },
          core2: { value: 101 },
          ctxFromA: { ctxFromA: 'aString core 101' },
          ctxFromB: { value: 277 },
        },
        request,
        response
      );
    });

    it('exposes all core context to core providers', async () => {
      expect.assertions(4);
      const contextContainer = new ContextContainer(plugins, coreId);

      contextContainer
        .registerContext(coreId, 'core1', (context) => {
          expect(context).toEqual({});
          return { value: 'core' };
        })
        .registerContext(coreId, 'core2', (context) => {
          expect(context).toEqual({ core1: { value: 'core' } });
          return { value: 101 };
        });

      const rawHandler1 = jest.fn(() => 'handler1' as any);
      const handler1 = contextContainer.createHandler(pluginA, rawHandler1);

      const request = httpServerMock.createKibanaRequest();
      const response = httpServerMock.createResponseFactory();
      expect(await handler1(request, response)).toEqual('handler1');

      // If no context is registered for pluginA, only core contexts should be exposed
      expect(rawHandler1).toHaveBeenCalledWith(
        {
          core1: { value: 'core' },
          core2: { value: 101 },
        },
        request,
        response
      );
    });

    it('does not expose plugin contexts to core handler', async () => {
      const contextContainer = new ContextContainer(plugins, coreId);

      contextContainer
        .registerContext(coreId, 'core1', (context) => ({ value: 'core' }))
        .registerContext(pluginA, 'ctxFromA', (context) => ({ value: 'aString' }));

      const rawHandler1 = jest.fn(() => 'handler1' as any);
      const handler1 = contextContainer.createHandler(coreId, rawHandler1);

      const request = httpServerMock.createKibanaRequest();
      const response = httpServerMock.createResponseFactory();
      expect(await handler1(request, response)).toEqual('handler1');
      // pluginA context should not be present in a core handler
      expect(rawHandler1).toHaveBeenCalledWith(
        {
          core1: { value: 'core' },
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
      contextContainer.registerContext(coreId, 'core1', (context, req, res) => {
        expect(req).toBe(request);
        expect(res).toBe(response);
        return { value: 'core' };
      });

      contextContainer.registerContext(pluginD, 'ctxFromD', (context, req, res) => {
        expect(req).toBe(request);
        expect(res).toBe(response);
        return {
          num: 77,
        };
      });

      const rawHandler1 = jest.fn(() => 'handler1' as any);
      const handler1 = contextContainer.createHandler(pluginD, rawHandler1);

      expect(await handler1(request, response)).toEqual('handler1');

      expect(rawHandler1).toHaveBeenCalledWith(
        {
          core1: { value: 'core' },
          ctxFromD: {
            num: 77,
          },
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
