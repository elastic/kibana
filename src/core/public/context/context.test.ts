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
    const contextContainer = new ContextContainerImplementation<MyContext>(plugins);
    contextContainer.register('ctxFromA', () => 'aString', 'pluginA');

    expect(() =>
      contextContainer.register('ctxFromA', () => 'aString', 'pluginA')
    ).toThrowErrorMatchingInlineSnapshot(
      `"Context provider for ctxFromA has already been registered."`
    );
  });

  it('resolves dependencies', async () => {
    expect.assertions(8);
    const contextContainer = new ContextContainerImplementation<MyContext>(plugins);

    contextContainer
      .register('core1', context => {
        expect(context).toEqual({});
        return 'core';
      })
      .register(
        'ctxFromA',
        context => {
          expect(context).toEqual({});
          return 'aString';
        },
        'pluginA'
      )
      .register(
        'ctxFromB',
        context => {
          expect(context).toEqual({ ctxFromA: 'aString' });
          return 299;
        },
        'pluginB'
      )
      .register(
        'ctxFromC',
        context => {
          expect(context).toEqual({ ctxFromA: 'aString', ctxFromB: 299 });
          return false;
        },
        'pluginC'
      )
      .register(
        'ctxFromD',
        context => {
          expect(context).toEqual({});
          return {};
        },
        'pluginD'
      );

    // Should have context from pluginC, its deps, and core
    expect(await contextContainer.createContext('pluginC')).toEqual({
      core1: 'core',
      ctxFromA: 'aString',
      ctxFromB: 299,
      ctxFromC: false,
    });

    // Should have context from pluginD, and core
    expect(await contextContainer.createContext('pluginD')).toEqual({
      core1: 'core',
      ctxFromD: {},
    });
  });

  it('exposes all previously registerd context to Core providers', async () => {
    expect.assertions(3);
    const contextContainer = new ContextContainerImplementation<MyContext>(plugins);

    contextContainer
      .register('core1', context => {
        expect(context).toEqual({});
        return 'core';
      })
      .register('core2', context => {
        expect(context).toEqual({ core1: 'core' });
        return 101;
      });

    // If no context is registered for pluginA, only core contexts should be exposed
    expect(await contextContainer.createContext('pluginA')).toEqual({
      core1: 'core',
      core2: 101,
    });
  });

  it('passes additional arguments to providers', async () => {
    expect.assertions(5);
    const contextContainer = new ContextContainerImplementation<MyContext, [string, number]>(
      plugins
    );

    contextContainer
      .register('core1', (context, str, num) => {
        expect(str).toEqual('passed string');
        expect(num).toEqual(77);
        return `core ${str}`;
      })
      .register('ctxFromD', (context, str, num) => {
        expect(str).toEqual('passed string');
        expect(num).toEqual(77);
        return {
          num: 77,
        };
      });

    expect(await contextContainer.createContext('pluginD', {}, 'passed string', 77)).toEqual({
      core1: 'core passed string',
      ctxFromD: {
        num: 77,
      },
    });
  });

  it('passes baseContext to context providers', async () => {
    expect.assertions(3);
    const contextContainer = new ContextContainerImplementation<MyContext>(plugins);

    contextContainer
      .register('core1', context => {
        expect(context.baseCtx).toEqual(1234);
        return 'core';
      })
      .register('ctxFromD', context => {
        expect(context.baseCtx).toEqual(1234);
        return {};
      });

    expect(await contextContainer.createContext('pluginD', { baseCtx: 1234 })).toEqual({
      core1: 'core',
      baseCtx: 1234,
      ctxFromD: {},
    });
  });
});
