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

const createExecution = (expression: string = 'foo bar=123') => {
  const executor = createUnitTestExecutor();
  const execution = new Execution({
    executor,
    ast: parseExpression(expression),
  });
  return execution;
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
});
