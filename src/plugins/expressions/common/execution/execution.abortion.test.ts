/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Execution } from './execution';
import { parseExpression } from '../ast';
import { createUnitTestExecutor } from '../test_helpers';

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

    const result = await execution.result;

    expect(result).toMatchObject({
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

    const result = await execution.result;

    expect(result).toMatchObject({
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

    const result = await execution.result;

    execution.cancel();

    expect(result).toBe(null);

    jest.useFakeTimers();
  });
});
