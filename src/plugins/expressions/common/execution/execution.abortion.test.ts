/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { waitFor } from '@testing-library/react';
import { firstValueFrom } from 'rxjs';
import { Execution } from './execution';
import { parseExpression } from '../ast';
import { createUnitTestExecutor } from '../test_helpers';
import { ExpressionFunctionDefinition } from '../expression_functions';

jest.useFakeTimers();

beforeEach(() => {
  jest.clearAllTimers();
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
    params: { ...context, debug },
  });
  return execution;
};

describe('Execution abortion tests', () => {
  test('can abort an expression immediately', async () => {
    const execution = createExecution('sleep 10');

    execution.start();
    execution.cancel();

    const result = await execution.result.toPromise();

    expect(result).toHaveProperty('result', {
      type: 'error',
      error: {
        message: 'The expression was aborted.',
        name: 'AbortError',
      },
    });
  });

  test('can abort an expression which has function running mid flight', async () => {
    const execution = createExecution('sleep 300');

    execution.start();
    jest.advanceTimersByTime(100);
    execution.cancel();

    const result = await execution.result.toPromise();

    expect(result).toHaveProperty('result', {
      type: 'error',
      error: {
        message: 'The expression was aborted.',
        name: 'AbortError',
      },
    });
  });

  test('cancelling execution after it completed has no effect', async () => {
    jest.useRealTimers();

    const execution = createExecution('sleep 1');

    execution.start();

    const { result } = await firstValueFrom(execution.result);

    execution.cancel();

    expect(result).toBe(null);

    jest.useFakeTimers();
  });

  test('nested expressions are aborted when parent aborted', async () => {
    jest.useRealTimers();
    const started = jest.fn();
    const completed = jest.fn();
    const aborted = jest.fn();

    const defer: ExpressionFunctionDefinition<'defer', unknown, { time: number }, unknown> = {
      name: 'defer',
      args: {
        time: {
          aliases: ['_'],
          help: 'Calls function from a context after delay unless aborted',
          types: ['number'],
        },
      },
      help: '',
      fn: async (input, args, { abortSignal }) => {
        started();
        await new Promise((r) => {
          const timeout = setTimeout(() => {
            if (!abortSignal.aborted) {
              completed();
            }
            r(undefined);
          }, args.time);

          abortSignal.addEventListener('abort', () => {
            aborted();
            clearTimeout(timeout);
            r(undefined);
          });
        });

        return args.time;
      },
    };

    const expression = 'defer time={defer time={defer time=300}}';
    const executor = createUnitTestExecutor();
    executor.registerFunction(defer);
    const execution = new Execution({
      executor,
      ast: parseExpression(expression),
      params: {},
    });

    execution.start().toPromise();

    await waitFor(() => expect(started).toHaveBeenCalledTimes(1));

    execution.cancel();
    const { result } = await firstValueFrom(execution.result);
    expect(result).toMatchObject({
      type: 'error',
      error: {
        message: 'The expression was aborted.',
        name: 'AbortError',
      },
    });

    await waitFor(() => expect(aborted).toHaveBeenCalledTimes(1));

    expect(started).toHaveBeenCalledTimes(1);
    expect(aborted).toHaveBeenCalledTimes(1);
    expect(completed).toHaveBeenCalledTimes(0);

    jest.useFakeTimers();
  });
});
