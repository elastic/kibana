/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { of } from 'rxjs';
import { first, scan } from 'rxjs/operators';
import { TestScheduler } from 'rxjs/testing';
import { Execution } from './execution';
import { parseExpression, ExpressionAstExpression } from '../ast';
import { createUnitTestExecutor } from '../test_helpers';
import { ExpressionFunctionDefinition } from '../../common';
import { ExecutionContract } from './execution_contract';

beforeAll(() => {
  if (typeof performance === 'undefined') {
    (global as any).performance = { now: Date.now };
  }
});

const createExecution = (
  expression: string = 'foo bar=123',
  context: Record<string, unknown> = {},
  debug: boolean = false
) => {
  const executor = createUnitTestExecutor();
  const execution = new Execution({
    executor,
    ast: parseExpression(expression),
    params: {
      ...context,
      debug,
    },
  });
  return execution;
};

const run = async (
  expression: string = 'foo bar=123',
  context?: Record<string, unknown>,
  input: any = null
) => {
  const execution = createExecution(expression, context);
  execution.start(input);
  return await execution.result.pipe(first()).toPromise();
};

let testScheduler: TestScheduler;

describe('Execution', () => {
  beforeEach(() => {
    testScheduler = new TestScheduler((actual, expected) => {
      return expect(actual).toStrictEqual(expected);
    });
  });

  test('can instantiate', () => {
    const execution = createExecution('foo bar=123');
    expect(execution.state.get().ast.chain[0].arguments.bar).toEqual([123]);
  });

  test('initial input is null at creation', () => {
    const execution = createExecution();
    expect(execution.input).toBe(null);
  });

  test('creates default ExecutionContext', () => {
    const execution = createExecution();
    expect(execution.context).toMatchObject({
      getSearchContext: expect.any(Function),
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
    const result = await execution.result.pipe(first()).toPromise();

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

    const result = await execution.result.pipe(first()).toPromise();

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

    const result = await execution.result.pipe(first()).toPromise();

    expect(result).toEqual({
      type: 'num',
      value: -30,
    });
  });

  describe('.input', () => {
    test('casts input to correct type', async () => {
      const execution = createExecution('add val=1');

      // Below 1 is cast to { type: 'num', value: 1 }.
      execution.start(1);
      const result = await execution.result.pipe(first()).toPromise();

      expect(result).toEqual({
        type: 'num',
        value: 2,
      });
    });

    test('supports promises on input', async () => {
      const execution = createExecution('add val=1');

      execution.start(Promise.resolve(1));
      const result = await execution.result.pipe(first()).toPromise();

      expect(result).toEqual({
        type: 'num',
        value: 2,
      });
    });

    test('supports observables on input', async () => {
      const execution = createExecution('add val=1');

      execution.start(of(1));
      const result = await execution.result.pipe(first()).toPromise();

      expect(result).toEqual({
        type: 'num',
        value: 2,
      });
    });

    test('handles observables on input', () => {
      const execution = createExecution('add val=1');

      testScheduler.run(({ cold, expectObservable }) => {
        const input = cold('   -a--b-c-', { a: 1, b: 2, c: 3 });
        const subscription = ' ---^---!';
        const expected = '     ---ab-c-';

        expectObservable(execution.start(input), subscription).toBe(expected, {
          a: { type: 'num', value: 2 },
          b: { type: 'num', value: 3 },
          c: { type: 'num', value: 4 },
        });
      });
    });

    test('stops when input errors', () => {
      const execution = createExecution('add val=1');

      testScheduler.run(({ cold, expectObservable }) => {
        const input = cold('-a-#-b-', { a: 1, b: 2 });
        const expected = '  -a-#';

        expectObservable(execution.start(input)).toBe(expected, {
          a: { type: 'num', value: 2 },
        });
      });
    });

    test('does not complete when input completes', () => {
      const execution = createExecution('add val=1');

      testScheduler.run(({ cold, expectObservable }) => {
        const input = cold('-a-b|', { a: 1, b: 2 });
        const expected = '  -a-b-';

        expectObservable(execution.start(input)).toBe(expected, {
          a: { type: 'num', value: 2 },
          b: { type: 'num', value: 3 },
        });
      });
    });

    test('handles partial results', () => {
      const execution = createExecution('sum');

      testScheduler.run(({ cold, expectObservable }) => {
        const items = cold('   -a--b-c-', { a: 1, b: 2, c: 3 });
        const subscription = ' ---^---!';
        const expected = '     ---ab-c-';
        const input = items.pipe(scan((result, value) => [...result, value], new Array<number>()));

        expectObservable(execution.start(input), subscription).toBe(expected, {
          a: { type: 'num', value: 1 },
          b: { type: 'num', value: 3 },
          c: { type: 'num', value: 6 },
        });
      });
    });
  });

  describe('.expression', () => {
    test('uses expression passed in to constructor', () => {
      const expression = 'add val="1"';
      const executor = createUnitTestExecutor();
      const execution = new Execution({
        executor,
        expression,
        params: {},
      });
      expect(execution.expression).toBe(expression);
    });

    test('generates expression from AST if not passed to constructor', () => {
      const expression = 'add val="1"';
      const executor = createUnitTestExecutor();
      const execution = new Execution({
        ast: parseExpression(expression),
        executor,
        params: {},
      });
      expect(execution.expression).toBe(expression);
    });
  });

  describe('.contract', () => {
    test('is instance of ExecutionContract', () => {
      const execution = createExecution('add val=1');
      expect(execution.contract).toBeInstanceOf(ExecutionContract);
    });

    test('execution returns the same expression string', () => {
      const execution = createExecution('add val=1');
      expect(execution.expression).toBe(execution.contract.getExpression());
    });
  });

  describe('execution context', () => {
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

    test('context.getKibanaRequest is a function if provided', async () => {
      const { result } = (await run('introspectContext key="getKibanaRequest"', {
        kibanaRequest: {},
      })) as any;
      expect(typeof result).toBe('function');
    });

    test('context.getKibanaRequest is undefined if not provided', async () => {
      const { result } = (await run('introspectContext key="getKibanaRequest"')) as any;
      expect(typeof result).toBe('undefined');
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
    test('by default, "tables" and "requests" inspector adapters are available', async () => {
      const { result } = (await run('introspectContext key="inspectorAdapters"')) as any;
      expect(result).toMatchObject({
        tables: expect.any(Object),
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

      const result = await execution.result.pipe(first()).toPromise();

      expect(result).toEqual({
        type: 'num',
        value: 3,
      });
    });

    test('can execute async functions', async () => {
      const res = await run('sleep 10 | sleep 10');
      expect(res).toBe(null);
    });

    test('result is undefined until execution completes', async () => {
      const execution = createExecution('sleep 10');
      expect(execution.state.get().result).toBe(undefined);
      execution.start(null).subscribe(jest.fn());
      expect(execution.state.get().result).toBe(undefined);
      await new Promise((r) => setTimeout(r, 1));
      expect(execution.state.get().result).toBe(undefined);
      await new Promise((r) => setTimeout(r, 11));
      expect(execution.state.get().result).toBe(null);
    });

    test('handles functions returning observables', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        const arg = cold('     -a-b-c|', { a: 1, b: 2, c: 3 });
        const expected = '     -a-b-c-';
        const observable: ExpressionFunctionDefinition<'observable', any, {}, any> = {
          name: 'observable',
          args: {},
          help: '',
          fn: () => arg,
        };
        const executor = createUnitTestExecutor();
        executor.registerFunction(observable);

        const result = executor.run('observable', null, {});

        expectObservable(result).toBe(expected, { a: 1, b: 2, c: 3 });
      });
    });
  });

  describe('when function throws', () => {
    test('error is reported in output object', async () => {
      const result = await run('error "foobar"');

      expect(result).toMatchObject({
        type: 'error',
      });
    });

    test('error message is prefixed with function name', async () => {
      const result = await run('error "foobar"');

      expect(result).toMatchObject({
        error: {
          message: `[error] > foobar`,
        },
      });
    });

    test('returns error of the first function that throws', async () => {
      const result = await run('error "foo" | error "bar"');

      expect(result).toMatchObject({
        error: {
          message: `[error] > foo`,
        },
      });
    });

    test('when function throws, execution still succeeds', async () => {
      const execution = await createExecution('error "foo"');
      execution.start(null);

      const result = await execution.result.pipe(first()).toPromise();

      expect(result).toMatchObject({
        type: 'error',
      });
      expect(execution.state.get().state).toBe('result');
      expect(execution.state.get().result).toMatchObject({
        type: 'error',
      });
    });

    test('does not execute remaining functions in pipeline', async () => {
      const spy: ExpressionFunctionDefinition<'spy', any, {}, any> = {
        name: 'spy',
        args: {},
        help: '',
        fn: jest.fn(),
      };
      const executor = createUnitTestExecutor();
      executor.registerFunction(spy);

      await executor.run('error "..." | spy', null).pipe(first()).toPromise();

      expect(spy.fn).toHaveBeenCalledTimes(0);
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
      jest.useFakeTimers();
      const execution = createExecution('sleep 20');
      execution.start(null);
      jest.advanceTimersByTime(5);
      expect(execution.state.get().state).toBe('pending');
      jest.useRealTimers();
    });

    test('execution state is "result" when execution successfully completes', async () => {
      const execution = createExecution('sleep 1');
      execution.start(null);
      await execution.result.pipe(first()).toPromise();
      expect(execution.state.get().state).toBe('result');
    });

    test('execution state is "result" when execution successfully completes - 2', async () => {
      const execution = createExecution('var foo');
      execution.start(null);
      await execution.result.pipe(first()).toPromise();
      expect(execution.state.get().state).toBe('result');
    });
  });

  describe('sub-expressions', () => {
    test('executes sub-expressions', async () => {
      const result = await run('add val={add 5 | access "value"}', {}, null);

      expect(result).toMatchObject({
        type: 'num',
        value: 5,
      });
    });

    test('can use global variables', async () => {
      const result = await run(
        'add val={var foo}',
        {
          variables: {
            foo: 3,
          },
        },
        null
      );

      expect(result).toMatchObject({
        type: 'num',
        value: 3,
      });
    });

    test('can modify global variables', async () => {
      const result = await run(
        'add val={var_set name=foo value=66 | var bar} | var foo',
        {
          variables: {
            foo: 3,
            bar: 25,
          },
        },
        null
      );

      expect(result).toBe(66);
    });

    test('supports observables in arguments', () => {
      const observable = {
        name: 'observable',
        args: {},
        help: '',
        fn: () => of(1),
      };
      const executor = createUnitTestExecutor();
      executor.registerFunction(observable);

      expect(
        executor.run('add val={observable}', 1, {}).pipe(first()).toPromise()
      ).resolves.toEqual({
        type: 'num',
        value: 2,
      });
    });

    test('supports observables in arguments emitting multiple values', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        const arg = cold('-a-b-c-', { a: 1, b: 2, c: 3 });
        const expected = '-a-b-c-';
        const observable = {
          name: 'observable',
          args: {},
          help: '',
          fn: () => arg,
        };
        const executor = createUnitTestExecutor();
        executor.registerFunction(observable);

        const result = executor.run('add val={observable}', 1, {});

        expectObservable(result).toBe(expected, {
          a: { type: 'num', value: 2 },
          b: { type: 'num', value: 3 },
          c: { type: 'num', value: 4 },
        });
      });
    });

    test('combines multiple observables in arguments', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        const arg1 = cold('--ab-c-', { a: 0, b: 2, c: 4 });
        const arg2 = cold('-a--bc-', { a: 1, b: 3, c: 5 });
        const expected = ' --abc(de)-';
        const observable1 = {
          name: 'observable1',
          args: {},
          help: '',
          fn: () => arg1,
        };
        const observable2 = {
          name: 'observable2',
          args: {},
          help: '',
          fn: () => arg2,
        };
        const max: ExpressionFunctionDefinition<'max', any, { val1: number; val2: number }, any> = {
          name: 'max',
          args: {
            val1: { help: '', types: ['number'] },
            val2: { help: '', types: ['number'] },
          },
          help: '',
          fn: (input, { val1, val2 }) => ({ type: 'num', value: Math.max(val1, val2) }),
        };
        const executor = createUnitTestExecutor();
        executor.registerFunction(observable1);
        executor.registerFunction(observable2);
        executor.registerFunction(max);

        const result = executor.run('max val1={observable1} val2={observable2}', {});

        expectObservable(result).toBe(expected, {
          a: { type: 'num', value: 1 },
          b: { type: 'num', value: 2 },
          c: { type: 'num', value: 3 },
          d: { type: 'num', value: 4 },
          e: { type: 'num', value: 5 },
        });
      });
    });

    test('does not complete when an argument completes', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        const arg = cold('-a|', { a: 1 });
        const expected = '-a-';
        const observable = {
          name: 'observable',
          args: {},
          help: '',
          fn: () => arg,
        };
        const executor = createUnitTestExecutor();
        executor.registerFunction(observable);

        const result = executor.run('add val={observable}', 1, {});

        expectObservable(result).toBe(expected, {
          a: { type: 'num', value: 2 },
        });
      });
    });

    test('handles error in observable arguments', () => {
      testScheduler.run(({ cold, expectObservable }) => {
        const arg = cold('-a-#', { a: 1 }, new Error('some error'));
        const expected = '-a-b';
        const observable = {
          name: 'observable',
          args: {},
          help: '',
          fn: () => arg,
        };
        const executor = createUnitTestExecutor();
        executor.registerFunction(observable);

        const result = executor.run('add val={observable}', 1, {});

        expectObservable(result).toBe(expected, {
          a: { type: 'num', value: 2 },
          b: {
            error: expect.objectContaining({
              message: '[add] > [observable] > some error',
            }),
            type: 'error',
          },
        });
      });
    });
  });

  describe('when arguments are missing', () => {
    it('when required argument is missing and has not alias, returns error', async () => {
      const requiredArg: ExpressionFunctionDefinition<'requiredArg', any, { arg: any }, any> = {
        name: 'requiredArg',
        args: {
          arg: {
            help: '',
            required: true,
          },
        },
        help: '',
        fn: jest.fn(),
      };
      const executor = createUnitTestExecutor();
      executor.registerFunction(requiredArg);
      const result = await executor.run('requiredArg', null, {}).pipe(first()).toPromise();

      expect(result).toMatchObject({
        type: 'error',
        error: {
          message: '[requiredArg] > requiredArg requires an argument',
        },
      });
    });

    test('when required argument is missing and has alias, returns error', async () => {
      const result = await run('var_set', {});

      expect(result).toMatchObject({
        type: 'error',
        error: {
          message: '[var_set] > var_set requires an "name" argument',
        },
      });
    });
  });

  describe('debug mode', () => {
    test('can execute expression in debug mode', async () => {
      const execution = createExecution('add val=1 | add val=2 | add val=3', {}, true);
      execution.start(-1);
      const result = await execution.result.pipe(first()).toPromise();

      expect(result).toEqual({
        type: 'num',
        value: 5,
      });
    });

    test('can execute expression with sub-expression in debug mode', async () => {
      const execution = createExecution(
        'add val={var_set name=foo value=5 | var name=foo} | add val=10',
        {},
        true
      );
      execution.start(0);
      const result = await execution.result.pipe(first()).toPromise();

      expect(result).toEqual({
        type: 'num',
        value: 15,
      });
    });

    describe('when functions succeed', () => {
      test('sets "success" flag on all functions to true', async () => {
        const execution = createExecution('add val=1 | add val=2 | add val=3', {}, true);
        execution.start(-1);
        await execution.result.pipe(first()).toPromise();

        for (const node of execution.state.get().ast.chain) {
          expect(node.debug?.success).toBe(true);
        }
      });

      test('stores "fn" reference to the function', async () => {
        const execution = createExecution('add val=1 | add val=2 | add val=3', {}, true);
        execution.start(-1);
        await execution.result.pipe(first()).toPromise();

        for (const node of execution.state.get().ast.chain) {
          expect(node.debug?.fn).toBe('add');
        }
      });

      test('saves duration it took to execute each function', async () => {
        const execution = createExecution('add val=1 | add val=2 | add val=3', {}, true);
        execution.start(-1);
        await execution.result.pipe(first()).toPromise();

        for (const node of execution.state.get().ast.chain) {
          expect(typeof node.debug?.duration).toBe('number');
          expect(node.debug?.duration).toBeLessThan(100);
          expect(node.debug?.duration).toBeGreaterThanOrEqual(0);
        }
      });

      test('adds .debug field in expression AST on each executed function', async () => {
        const execution = createExecution('add val=1 | add val=2 | add val=3', {}, true);
        execution.start(-1);
        await execution.result.pipe(first()).toPromise();

        for (const node of execution.state.get().ast.chain) {
          expect(typeof node.debug).toBe('object');
          expect(!!node.debug).toBe(true);
        }
      });

      test('stores input of each function', async () => {
        const execution = createExecution('add val=1 | add val=2 | add val=3', {}, true);
        execution.start(-1);
        await execution.result.pipe(first()).toPromise();

        const { chain } = execution.state.get().ast;

        expect(chain[0].debug!.input).toBe(-1);
        expect(chain[1].debug!.input).toEqual({
          type: 'num',
          value: 0,
        });
        expect(chain[2].debug!.input).toEqual({
          type: 'num',
          value: 2,
        });
      });

      test('stores output of each function', async () => {
        const execution = createExecution('add val=1 | add val=2 | add val=3', {}, true);
        execution.start(-1);
        await execution.result.pipe(first()).toPromise();

        const { chain } = execution.state.get().ast;

        expect(chain[0].debug!.output).toEqual({
          type: 'num',
          value: 0,
        });
        expect(chain[1].debug!.output).toEqual({
          type: 'num',
          value: 2,
        });
        expect(chain[2].debug!.output).toEqual({
          type: 'num',
          value: 5,
        });
      });

      test('stores resolved arguments of a function', async () => {
        const execution = createExecution(
          'add val={var_set name=foo value=5 | var name=foo} | add val=10',
          {},
          true
        );
        execution.start(-1);
        await execution.result.pipe(first()).toPromise();

        const { chain } = execution.state.get().ast;

        expect(chain[0].debug!.args).toEqual({
          val: 5,
        });

        expect((chain[0].arguments.val[0] as ExpressionAstExpression).chain[0].debug!.args).toEqual(
          {
            name: 'foo',
            value: 5,
          }
        );
      });

      test('store debug information about sub-expressions', async () => {
        const execution = createExecution(
          'add val={var_set name=foo value=5 | var name=foo} | add val=10',
          {},
          true
        );
        execution.start(0);
        await execution.result.pipe(first()).toPromise();

        const { chain } = execution.state.get().ast.chain[0].arguments
          .val[0] as ExpressionAstExpression;

        expect(typeof chain[0].debug).toBe('object');
        expect(typeof chain[1].debug).toBe('object');
        expect(!!chain[0].debug).toBe(true);
        expect(!!chain[1].debug).toBe(true);

        expect(chain[0].debug!.input).toBe(0);
        expect(chain[0].debug!.output).toBe(0);
        expect(chain[1].debug!.input).toBe(0);
        expect(chain[1].debug!.output).toBe(5);
      });
    });

    describe('when expression throws', () => {
      const executor = createUnitTestExecutor();
      executor.registerFunction({
        name: 'throws',
        args: {},
        help: '',
        fn: () => {
          throw new Error('foo');
        },
      });

      test('stores debug information up until the function that throws', async () => {
        const execution = new Execution({
          executor,
          ast: parseExpression('add val=1 | throws | add val=3'),
          params: { debug: true },
        });
        execution.start(0);
        await execution.result.pipe(first()).toPromise();

        const node1 = execution.state.get().ast.chain[0];
        const node2 = execution.state.get().ast.chain[1];
        const node3 = execution.state.get().ast.chain[2];

        expect(typeof node1.debug).toBe('object');
        expect(typeof node2.debug).toBe('object');
        expect(typeof node3.debug).toBe('undefined');
      });

      test('stores error thrown in debug information', async () => {
        const execution = new Execution({
          executor,
          ast: parseExpression('add val=1 | throws | add val=3'),
          params: { debug: true },
        });
        execution.start(0);
        await execution.result.pipe(first()).toPromise();

        const node2 = execution.state.get().ast.chain[1];

        expect(node2.debug?.error).toMatchObject({
          type: 'error',
          error: {
            message: '[throws] > foo',
          },
        });
        expect(node2.debug?.rawError).toBeInstanceOf(Error);
        expect(node2.debug?.rawError).toEqual(new Error('foo'));
      });

      test('sets .debug object to expected shape', async () => {
        const execution = new Execution({
          executor,
          ast: parseExpression('add val=1 | throws | add val=3'),
          params: { debug: true },
        });
        execution.start(0);
        await execution.result.pipe(first()).toPromise();

        const node2 = execution.state.get().ast.chain[1];

        expect(node2.debug).toMatchObject({
          success: false,
          fn: 'throws',
          input: expect.any(Object),
          args: expect.any(Object),
          error: expect.any(Object),
          rawError: expect.any(Error),
          duration: expect.any(Number),
        });
      });
    });
  });
});
