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
import { PluginOpaqueId } from '../server';

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

interface MyContext {
  core1: string;
  core2: number;
  ctxFromA: string;
  ctxFromB: number;
  ctxFromC: boolean;
  ctxFromD: object;
}

const coreId = Symbol();

describe('ContextContainer', () => {
  it('does not allow the same context to be registered twice', () => {
    const contextContainer = new ContextContainer<(context: MyContext) => string>(plugins, coreId);
    contextContainer.registerContext(coreId, 'ctxFromA', () => 'aString');

    expect(() =>
      contextContainer.registerContext(coreId, 'ctxFromA', () => 'aString')
    ).toThrowErrorMatchingInlineSnapshot(
      `"Context provider for ctxFromA has already been registered."`
    );
  });

  describe('registerContext', () => {
    it('throws error if called with an unknown symbol', async () => {
      const contextContainer = new ContextContainer<(context: MyContext) => string>(
        plugins,
        coreId
      );
      await expect(() =>
        contextContainer.registerContext(Symbol('unknown'), 'ctxFromA', jest.fn())
      ).toThrowErrorMatchingInlineSnapshot(
        `"Cannot register context for unknown plugin: Symbol(unknown)"`
      );
    });
  });

  describe('context building', () => {
    it('resolves dependencies', async () => {
      const contextContainer = new ContextContainer<(context: MyContext) => string>(
        plugins,
        coreId
      );
      expect.assertions(8);
      contextContainer.registerContext(coreId, 'core1', context => {
        expect(context).toEqual({});
        return 'core';
      });

      contextContainer.registerContext(pluginA, 'ctxFromA', context => {
        expect(context).toEqual({ core1: 'core' });
        return 'aString';
      });
      contextContainer.registerContext(pluginB, 'ctxFromB', context => {
        expect(context).toEqual({ core1: 'core', ctxFromA: 'aString' });
        return 299;
      });
      contextContainer.registerContext(pluginC, 'ctxFromC', context => {
        expect(context).toEqual({ core1: 'core', ctxFromA: 'aString', ctxFromB: 299 });
        return false;
      });
      contextContainer.registerContext(pluginD, 'ctxFromD', context => {
        expect(context).toEqual({ core1: 'core' });
        return {};
      });

      const rawHandler1 = jest.fn<string, []>(() => 'handler1');
      const handler1 = contextContainer.createHandler(pluginC, rawHandler1);

      const rawHandler2 = jest.fn<string, []>(() => 'handler2');
      const handler2 = contextContainer.createHandler(pluginD, rawHandler2);

      await handler1();
      await handler2();

      // Should have context from pluginC, its deps, and core
      expect(rawHandler1).toHaveBeenCalledWith({
        core1: 'core',
        ctxFromA: 'aString',
        ctxFromB: 299,
        ctxFromC: false,
      });

      // Should have context from pluginD, and core
      expect(rawHandler2).toHaveBeenCalledWith({
        core1: 'core',
        ctxFromD: {},
      });
    });

    it('exposes all core context to all providers regardless of registration order', async () => {
      expect.assertions(4);

      const contextContainer = new ContextContainer<(context: MyContext) => string>(
        plugins,
        coreId
      );
      contextContainer
        .registerContext(pluginA, 'ctxFromA', context => {
          expect(context).toEqual({ core1: 'core', core2: 101 });
          return `aString ${context.core1} ${context.core2}`;
        })
        .registerContext(coreId, 'core1', () => 'core')
        .registerContext(coreId, 'core2', () => 101)
        .registerContext(pluginB, 'ctxFromB', context => {
          expect(context).toEqual({ core1: 'core', core2: 101, ctxFromA: 'aString core 101' });
          return 277;
        });

      const rawHandler1 = jest.fn<string, []>(() => 'handler1');
      const handler1 = contextContainer.createHandler(pluginB, rawHandler1);

      expect(await handler1()).toEqual('handler1');

      expect(rawHandler1).toHaveBeenCalledWith({
        core1: 'core',
        core2: 101,
        ctxFromA: 'aString core 101',
        ctxFromB: 277,
      });
    });

    it('exposes all core context to core providers', async () => {
      expect.assertions(4);
      const contextContainer = new ContextContainer<(context: MyContext) => string>(
        plugins,
        coreId
      );

      contextContainer
        .registerContext(coreId, 'core1', context => {
          expect(context).toEqual({});
          return 'core';
        })
        .registerContext(coreId, 'core2', context => {
          expect(context).toEqual({ core1: 'core' });
          return 101;
        });

      const rawHandler1 = jest.fn<string, []>(() => 'handler1');
      const handler1 = contextContainer.createHandler(pluginA, rawHandler1);

      expect(await handler1()).toEqual('handler1');

      // If no context is registered for pluginA, only core contexts should be exposed
      expect(rawHandler1).toHaveBeenCalledWith({
        core1: 'core',
        core2: 101,
      });
    });

    it('does not expose plugin contexts to core handler', async () => {
      const contextContainer = new ContextContainer<(context: MyContext) => string>(
        plugins,
        coreId
      );

      contextContainer
        .registerContext(coreId, 'core1', context => 'core')
        .registerContext(pluginA, 'ctxFromA', context => 'aString');

      const rawHandler1 = jest.fn<string, []>(() => 'handler1');
      const handler1 = contextContainer.createHandler(coreId, rawHandler1);

      expect(await handler1()).toEqual('handler1');
      // pluginA context should not be present in a core handler
      expect(rawHandler1).toHaveBeenCalledWith({
        core1: 'core',
      });
    });

    it('passes additional arguments to providers', async () => {
      expect.assertions(6);
      const contextContainer = new ContextContainer<
        (context: MyContext, arg1: string, arg2: number) => string
      >(plugins, coreId);

      contextContainer.registerContext(coreId, 'core1', (context, str, num) => {
        expect(str).toEqual('passed string');
        expect(num).toEqual(77);
        return `core ${str}`;
      });

      contextContainer.registerContext(pluginD, 'ctxFromD', (context, str, num) => {
        expect(str).toEqual('passed string');
        expect(num).toEqual(77);
        return {
          num: 77,
        };
      });

      const rawHandler1 = jest.fn<string, [MyContext, string, number]>(() => 'handler1');
      const handler1 = contextContainer.createHandler(pluginD, rawHandler1);

      expect(await handler1('passed string', 77)).toEqual('handler1');

      expect(rawHandler1).toHaveBeenCalledWith(
        {
          core1: 'core passed string',
          ctxFromD: {
            num: 77,
          },
        },
        'passed string',
        77
      );
    });
  });

  describe('createHandler', () => {
    it('throws error if called with an unknown symbol', async () => {
      const contextContainer = new ContextContainer<(context: MyContext) => string>(
        plugins,
        coreId
      );
      await expect(() =>
        contextContainer.createHandler(Symbol('unknown'), jest.fn())
      ).toThrowErrorMatchingInlineSnapshot(
        `"Cannot create handler for unknown plugin: Symbol(unknown)"`
      );
    });

    it('returns value from original handler', async () => {
      const contextContainer = new ContextContainer<(context: MyContext) => string>(
        plugins,
        coreId
      );
      const rawHandler1 = jest.fn(() => 'handler1');
      const handler1 = contextContainer.createHandler(pluginA, rawHandler1);

      expect(await handler1()).toEqual('handler1');
    });

    it('passes additional arguments to handlers', async () => {
      const contextContainer = new ContextContainer<
        (context: MyContext, arg1: string, arg2: number) => string
      >(plugins, coreId);

      const rawHandler1 = jest.fn<string, [MyContext, string, number]>(() => 'handler1');
      const handler1 = contextContainer.createHandler(pluginA, rawHandler1);

      await handler1('passed string', 77);
      expect(rawHandler1).toHaveBeenCalledWith({}, 'passed string', 77);
    });
  });
});
