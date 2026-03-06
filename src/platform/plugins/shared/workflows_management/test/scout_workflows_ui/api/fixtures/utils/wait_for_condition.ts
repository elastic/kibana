/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
interface WaitForConditionParams<T> {
  action: () => Promise<T>;
  condition: (result: T) => boolean | Promise<boolean>;
  interval?: number;
  timeout?: number;
}

interface WaitForConditionOrThrowParams<T> extends WaitForConditionParams<T> {
  errorMessage?: string | ((lastResult: T) => string);
}

/**
 * Polls {@link WaitForConditionParams.action} until {@link WaitForConditionParams.condition}
 * returns `true` or the timeout elapses. Always executes the action at least once.
 *
 * @param params.interval - Polling interval in ms (default: 1000).
 * @param params.timeout - Maximum wait time in ms (default: 10000).
 * @returns `{ success: true, result }` when the condition is met,
 *          or `{ success: false, result }` with the last polled value on timeout.
 */
export async function waitForCondition<T>(params: WaitForConditionParams<T>): Promise<{
  success: boolean;
  result: T;
}> {
  const { action, condition, interval = 1000, timeout = 10000 } = params;

  const startTime = Date.now();
  let result: T;

  do {
    result = await action();

    if (await condition(result)) {
      console.info('Condition met after', Date.now() - startTime, 'ms');
      return { success: true, result };
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  } while (Date.now() - startTime < timeout);

  return { success: false, result };
}

/**
 * Same as {@link waitForCondition}, but throws an `Error` instead of returning
 * a failure object when the timeout elapses without the condition being met.
 *
 * @param params.interval - Polling interval in ms (default: 1000).
 * @param params.timeout - Maximum wait time in ms (default: 10000).
 * @param params.errorMessage - Optional static string or callback that receives
 *        the last polled result and returns a descriptive message for the error.
 * @throws {Error} with the timeout duration and the provided (or default) detail.
 */
export async function waitForConditionOrThrow<T>(
  params: WaitForConditionOrThrowParams<T>
): Promise<T> {
  const waitResult = await waitForCondition(params);
  if (waitResult.success) {
    return waitResult.result;
  }

  const { errorMessage, timeout = 10000 } = params;
  const detail =
    typeof errorMessage === 'function'
      ? errorMessage(waitResult.result)
      : errorMessage ?? `Last result: ${JSON.stringify(waitResult.result)}`;

  throw new Error(`Condition not met within ${timeout}ms. ${detail}`);
}
