/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable, Subscriber } from 'rxjs';
import { first } from 'rxjs/operators';
import { Execution } from './execution';
import { parseExpression } from '../ast';
import { createUnitTestExecutor } from '../test_helpers';
import { ExecutionContract } from './execution_contract';
import { ExpressionFunctionDefinition } from '../expression_functions';

const createExecution = (
  expression: string = 'foo bar=123',
  context: Record<string, unknown> = {}
) => {
  const executor = createUnitTestExecutor();
  const execution = new Execution({
    executor,
    ast: parseExpression(expression),
    params: { ...context },
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
    const spy = jest.spyOn(execution, 'cancel').mockImplementation(() => {});
    const contract = new ExecutionContract(execution);

    expect(spy).toHaveBeenCalledTimes(0);
    contract.cancel();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('can get inspector adapters', () => {
    const execution = createExecution('foo bar=123');
    const contract = new ExecutionContract(execution);
    expect(contract.inspect()).toMatchObject({
      tables: expect.any(Object),
      requests: expect.any(Object),
    });
  });

  test('can get error result of the expression execution', () => {
    const execution = createExecution('foo bar=123');
    const contract = new ExecutionContract(execution);
    execution.start();

    expect(contract.getData().toPromise()).resolves.toHaveProperty(
      'result',
      expect.objectContaining({ type: 'error' })
    );
  });

  test('can get result of the expression execution', () => {
    const execution = createExecution('var_set name="foo" value="bar" | var name="foo"');
    const contract = new ExecutionContract(execution);
    execution.start();

    expect(contract.getData().toPromise()).resolves.toHaveProperty('result', 'bar');
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
      await execution.result.pipe(first()).toPromise();

      expect(contract.isPending).toBe(false);
      expect(execution.state.get().state).toBe('result');
    });

    test('is false when execution finished with error', async () => {
      const execution = createExecution('var_set name="foo" value="bar" | var name="foo"');
      const contract = new ExecutionContract(execution);

      execution.start();
      execution.state.get().state = 'error';

      expect(contract.isPending).toBe(false);
      expect(execution.state.get().state).toBe('error');
    });

    test('is true when execution is in progress but got partial result, is false once we get final result', async () => {
      let mySubscriber: Subscriber<number>;
      const arg = new Observable((subscriber) => {
        mySubscriber = subscriber;
        subscriber.next(1);
      });

      const observable: ExpressionFunctionDefinition<'observable', unknown, {}, unknown> = {
        name: 'observable',
        args: {},
        help: '',
        fn: () => arg,
      };
      const executor = createUnitTestExecutor();
      executor.registerFunction(observable);

      const execution = executor.createExecution('observable');
      execution.start(null);
      await execution.result.pipe(first()).toPromise();

      expect(execution.contract.isPending).toBe(true);
      expect(execution.state.get().state).toBe('result');

      mySubscriber!.next(2);
      mySubscriber!.complete();

      expect(execution.contract.isPending).toBe(false);
      expect(execution.state.get().state).toBe('result');
    });
  });
});
