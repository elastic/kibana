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
import { ExecutionContract } from './execution_contract';

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

describe('ExecutionContract', () => {
  test('can instantiate', () => {
    const execution = createExecution('foo bar=123');
    const contract = new ExecutionContract(execution);
    expect(contract).toBeInstanceOf(ExecutionContract);
  });

  test('can get the AST of expression', () => {
    const execution = createExecution('foo bar=123');
    const contract = new ExecutionContract(execution);
    expect(contract.getAst()).toMatchObject({
      type: 'expression',
      chain: expect.any(Array),
    });
  });

  test('can get expression string', () => {
    const execution = createExecution('foo bar=123');
    const contract = new ExecutionContract(execution);
    expect(contract.getExpression()).toBe('foo bar=123');
  });

  test('can cancel execution', () => {
    const execution = createExecution('foo bar=123');
    const spy = jest.spyOn(execution, 'cancel');
    const contract = new ExecutionContract(execution);

    expect(spy).toHaveBeenCalledTimes(0);
    contract.cancel();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('can get inspector adapters', () => {
    const execution = createExecution('foo bar=123');
    const contract = new ExecutionContract(execution);
    expect(contract.inspect()).toMatchObject({
      data: expect.any(Object),
      requests: expect.any(Object),
    });
  });

  test('can get error result of the expression execution', async () => {
    const execution = createExecution('foo bar=123');
    const contract = new ExecutionContract(execution);
    execution.start();

    const result = await contract.getData();

    expect(result).toMatchObject({
      type: 'error',
    });
  });

  test('can get result of the expression execution', async () => {
    const execution = createExecution('var_set name="foo" value="bar" | var name="foo"');
    const contract = new ExecutionContract(execution);
    execution.start();

    const result = await contract.getData();

    expect(result).toBe('bar');
  });

  describe('isPending', () => {
    test('is true if execution has not been started', async () => {
      const execution = createExecution('var_set name="foo" value="bar" | var name="foo"');
      const contract = new ExecutionContract(execution);
      expect(contract.isPending).toBe(true);
    });

    test('is true when execution just started', async () => {
      const execution = createExecution('var_set name="foo" value="bar" | var name="foo"');
      const contract = new ExecutionContract(execution);

      execution.start();

      expect(contract.isPending).toBe(true);
    });

    test('is false when execution finished successfully', async () => {
      const execution = createExecution('var_set name="foo" value="bar" | var name="foo"');
      const contract = new ExecutionContract(execution);

      execution.start();
      await execution.result;

      expect(contract.isPending).toBe(false);
      expect(execution.state.get().state).toBe('result');
    });

    test('is false when execution finished with error', async () => {
      const execution = createExecution('var_set name="foo" value="bar" | var name="foo"');
      const contract = new ExecutionContract(execution);

      execution.start();
      await execution.result;
      execution.state.get().state = 'error';

      expect(contract.isPending).toBe(false);
      expect(execution.state.get().state).toBe('error');
    });
  });
});
