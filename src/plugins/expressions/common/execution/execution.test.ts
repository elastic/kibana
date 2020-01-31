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

import { Execution } from './execution';
import { parseExpression } from '../ast';
import { createUnitTestExecutor } from '../test_helpers';

const createExecution = (
  expression: string = 'foo bar=123',
  context: Record<string, unknown> = {}
) => {
  const executor = createUnitTestExecutor();
  const execution = new Execution({
    executor,
    ast: parseExpression(expression),
    context,
  });
  return execution;
};

const run = async (expression: string = 'foo bar=123', context?: Record<string, unknown>) => {
  const execution = createExecution(expression, context);
  execution.start(null);
  return await execution.result;
};

describe('Execution', () => {
  test('can instantiate', () => {
    const execution = createExecution('foo bar=123');
    expect(execution.params.ast.chain[0].arguments.bar).toEqual([123]);
  });

  test('initial input is null at creation', () => {
    const execution = createExecution();
    expect(execution.input).toBe(null);
  });

  test('creates default ExecutionContext', () => {
    const execution = createExecution();
    expect(execution.context).toMatchObject({
      getInitialInput: expect.any(Function),
      getInitialContext: expect.any(Function),
      variables: expect.any(Object),
      types: expect.any(Object),
    });
  });

  test('executes a single clog function in expression pipeline', async () => {
    const execution = createExecution('clog');
    /* eslint-disable no-console */
    const console$log = console.log;
    const spy = (console.log = jest.fn());
    /* eslint-enable no-console */

    execution.start(123);
    const result = await execution.result;

    expect(result).toBe(123);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(123);

    /* eslint-disable no-console */
    console.log = console$log;
    /* eslint-enable no-console */
  });

  test('executes a chain of multiple "add" functions', async () => {
    const execution = createExecution('add val=1 | add val=2 | add val=3');
    execution.start({
      type: 'num',
      value: -1,
    });

    const result = await execution.result;

    expect(result).toEqual({
      type: 'num',
      value: 5,
    });
  });

  test('executes a chain of "add" and "mult" functions', async () => {
    const execution = createExecution('add val=5 | mult val=-1 | add val=-10 | mult val=2');
    execution.start({
      type: 'num',
      value: 0,
    });

    const result = await execution.result;

    expect(result).toEqual({
      type: 'num',
      value: -30,
    });
  });

  describe('execution context', () => {
    test('context.getInitialInput is a function', async () => {
      const { result } = (await run('introspectContext key="getInitialInput"')) as any;
      expect(typeof result).toBe('function');
    });

    test('context.getInitialContext is a function', async () => {
      const { result } = (await run('introspectContext key="getInitialContext"')) as any;
      expect(typeof result).toBe('function');
    });

    test('context.variables is an object', async () => {
      const { result } = (await run('introspectContext key="variables"')) as any;
      expect(typeof result).toBe('object');
    });

    test('context.types is an object', async () => {
      const { result } = (await run('introspectContext key="types"')) as any;
      expect(typeof result).toBe('object');
    });

    test('context.abortSignal is an object', async () => {
      const { result } = (await run('introspectContext key="abortSignal"')) as any;
      expect(typeof result).toBe('object');
    });

    test('context.inspectorAdapters is an object', async () => {
      const { result } = (await run('introspectContext key="inspectorAdapters"')) as any;
      expect(typeof result).toBe('object');
    });

    test('unknown context key is undefined', async () => {
      const { result } = (await run('introspectContext key="foo"')) as any;
      expect(typeof result).toBe('undefined');
    });

    test('can set context variables', async () => {
      const variables = { foo: 'bar' };
      const result = await run('var name="foo"', { variables });
      expect(result).toBe('bar');
    });
  });

  describe('inspector adapters', () => {
    test('by default, "data" and "requests" inspector adapters are available', async () => {
      const { result } = (await run('introspectContext key="inspectorAdapters"')) as any;
      expect(result).toMatchObject({
        data: expect.any(Object),
        requests: expect.any(Object),
      });
    });

    test('can set custom inspector adapters', async () => {
      const inspectorAdapters = {};
      const { result } = (await run('introspectContext key="inspectorAdapters"', {
        inspectorAdapters,
      })) as any;
      expect(result).toBe(inspectorAdapters);
    });

    test('can access custom inspector adapters on Execution object', async () => {
      const inspectorAdapters = {};
      const execution = createExecution('introspectContext key="inspectorAdapters"', {
        inspectorAdapters,
      });
      expect(execution.inspectorAdapters).toBe(inspectorAdapters);
    });
  });

  describe('expression abortion', () => {
    test('context has abortSignal object', async () => {
      const { result } = (await run('introspectContext key="abortSignal"')) as any;

      expect(typeof result).toBe('object');
      expect((result as AbortSignal).aborted).toBe(false);
    });
  });

  describe('expression execution', () => {
    test('supports default argument alias _', async () => {
      const execution = createExecution('add val=1 | add 2');
      execution.start({
        type: 'num',
        value: 0,
      });

      const result = await execution.result;

      expect(result).toEqual({
        type: 'num',
        value: 3,
      });
    });

    test('can execute async functions', async () => {
      const res = await run('sleep 10 | sleep 10');
      expect(res).toBe(null);
    });
  });

  describe('state', () => {
    test('execution state is "not-started" before .start() is called', async () => {
      const execution = createExecution('var foo');
      expect(execution.state.get().state).toBe('not-started');
    });

    test('execution state is "pending" after .start() was called', async () => {
      const execution = createExecution('var foo');
      execution.start(null);
      expect(execution.state.get().state).toBe('pending');
    });

    test('execution state is "pending" while execution is in progress', async () => {
      const execution = createExecution('sleep 20');
      execution.start(null);
      await new Promise(r => setTimeout(r, 5));
      expect(execution.state.get().state).toBe('pending');
    });

    test('execution state is "result" when execution successfully completes', async () => {
      const execution = createExecution('sleep 20');
      execution.start(null);
      await new Promise(r => setTimeout(r, 21));
      expect(execution.state.get().state).toBe('result');
    });

    test('execution state is "result" when execution successfully completes - 2', async () => {
      const execution = createExecution('var foo');
      execution.start(null);
      await execution.result;
      expect(execution.state.get().state).toBe('result');
    });
  });
});
