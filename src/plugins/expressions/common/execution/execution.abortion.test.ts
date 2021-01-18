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
