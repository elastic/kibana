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

import { PluginName } from '../../server';
import { ContextContainerImplementation } from './context';

const plugins: ReadonlyMap<PluginName, PluginName[]> = new Map([
  ['pluginA', []],
  ['pluginB', ['pluginA']],
  ['pluginC', ['pluginA', 'pluginB']],
  ['pluginD', []],
]);

interface MyContext {
  core1: string;
  core2: number;
  ctxFromA: string;
  ctxFromB: number;
  ctxFromC: boolean;
  ctxFromD: object;
  baseCtx: number;
}

describe('ContextContainer', () => {
  it('does not allow the same context to be registered twice', () => {
    const contextContainer = new ContextContainerImplementation<MyContext, string>(plugins);
    contextContainer.registerContext('ctxFromA', () => 'aString');

    expect(() =>
      contextContainer.registerContext('ctxFromA', () => 'aString')
    ).toThrowErrorMatchingInlineSnapshot(
      `"Context provider for ctxFromA has already been registered."`
    );
  });

  describe('context building', () => {
    it('resolves dependencies', async () => {
      const contextContainer = new ContextContainerImplementation<MyContext, string>(plugins);
      expect.assertions(8);
      contextContainer.registerContext('core1', context => {
        expect(context).toEqual({});
        return 'core';
      });

      contextContainer.setCurrentPlugin('pluginA');
      contextContainer.registerContext('ctxFromA', context => {
        expect(context).toEqual({ core1: 'core' });
        return 'aString';
      });
      contextContainer.setCurrentPlugin('pluginB');
      contextContainer.registerContext('ctxFromB', context => {
        expect(context).toEqual({ core1: 'core', ctxFromA: 'aString' });
        return 299;
      });
      contextContainer.setCurrentPlugin('pluginC');
      contextContainer.registerContext('ctxFromC', context => {
        expect(context).toEqual({ core1: 'core', ctxFromA: 'aString', ctxFromB: 299 });
        return false;
      });
      contextContainer.setCurrentPlugin('pluginD');
      contextContainer.registerContext('ctxFromD', context => {
        expect(context).toEqual({ core1: 'core' });
        return {};
      });

      contextContainer.setCurrentPlugin('pluginC');
      const rawHandler1 = jest.fn<string, []>(() => 'handler1');
      const handler1 = contextContainer.createHandler(rawHandler1);

      contextContainer.setCurrentPlugin('pluginD');
      const rawHandler2 = jest.fn<string, []>(() => 'handler2');
      const handler2 = contextContainer.createHandler(rawHandler2);

      contextContainer.setCurrentPlugin(undefined);

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

    it('exposes all previously registered context to Core providers', async () => {
      expect.assertions(4);
      const contextContainer = new ContextContainerImplementation<MyContext, string>(plugins);

      contextContainer
        .registerContext('core1', context => {
          expect(context).toEqual({});
          return 'core';
        })
        .registerContext('core2', context => {
          expect(context).toEqual({ core1: 'core' });
          return 101;
        });

      contextContainer.setCurrentPlugin('pluginA');
      const rawHandler1 = jest.fn<string, []>(() => 'handler1');
      const handler1 = contextContainer.createHandler(rawHandler1);

      expect(await handler1()).toEqual('handler1');

      // If no context is registered for pluginA, only core contexts should be exposed
      expect(rawHandler1).toHaveBeenCalledWith({
        core1: 'core',
        core2: 101,
      });
    });

    it('passes additional arguments to providers', async () => {
      expect.assertions(6);
      const contextContainer = new ContextContainerImplementation<
        MyContext,
        string,
        [string, number]
      >(plugins);

      contextContainer.registerContext('core1', (context, str, num) => {
        expect(str).toEqual('passed string');
        expect(num).toEqual(77);
        return `core ${str}`;
      });

      contextContainer.setCurrentPlugin('pluginD');
      contextContainer.registerContext('ctxFromD', (context, str, num) => {
        expect(str).toEqual('passed string');
        expect(num).toEqual(77);
        return {
          num: 77,
        };
      });

      const rawHandler1 = jest.fn<string, [MyContext, string, number]>(() => 'handler1');
      const handler1 = contextContainer.createHandler(rawHandler1);

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
    it('throws error if registered outside plugin', async () => {
      const contextContainer = new ContextContainerImplementation<MyContext, string>(plugins);
      contextContainer.setCurrentPlugin(undefined);
      await expect(() =>
        contextContainer.createHandler(jest.fn())
      ).toThrowErrorMatchingInlineSnapshot(`"Cannot create handlers outside a plugin!"`);
    });

    it('returns value from original handler', async () => {
      const contextContainer = new ContextContainerImplementation<MyContext, string>(plugins);

      contextContainer.setCurrentPlugin('pluginA');
      const rawHandler1 = jest.fn(() => 'handler1');
      const handler1 = contextContainer.createHandler(rawHandler1);

      expect(await handler1()).toEqual('handler1');
    });

    it('passes additional arguments to handlers', async () => {
      const contextContainer = new ContextContainerImplementation<
        MyContext,
        string,
        [string, number]
      >(plugins);

      contextContainer.setCurrentPlugin('pluginA');
      const rawHandler1 = jest.fn<string, [MyContext, string, number]>(() => 'handler1');
      const handler1 = contextContainer.createHandler(rawHandler1);

      await handler1('passed string', 77);
      expect(rawHandler1).toHaveBeenCalledWith({}, 'passed string', 77);
    });
  });
});
