/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { inspect } from 'util';
import { delay } from '@kbn/test-jest-helpers';

const returnTrue = () => true;

const defaultOnFailure = (methodName: string) => (lastError: Error | undefined, reason: string) => {
  throw new Error(
    `${methodName} ${reason}\n${lastError ? `${lastError.stack || lastError.message}` : ''}`
  );
};

/**
 * Run a function and return either an error or result
 * @param {Function} block
 */
async function runAttempt<T>(block: () => Promise<T>): Promise<{ result: T } | { error: Error }> {
  try {
    return {
      result: await block(),
    };
  } catch (error) {
    return {
      // we rely on error being truthy and throwing falsy values is *allowed*
      // so we cast falsy values to errors
      error: error instanceof Error ? error : new Error(`${inspect(error)} thrown`),
    };
  }
}

interface Options<T> {
  timeout: number;
  methodName: string;
  block: () => Promise<T>;
  onFailureBlock?: () => Promise<T>;
  onFailure?: ReturnType<typeof defaultOnFailure>;
  accept?: (v: T) => boolean;
  description?: string;
  retryDelay?: number;
  initialDelay?: number;
}

export async function retryForSuccess<T>(log: ToolingLog, options: Options<T>): Promise<T> {
  const {
    description,
    timeout,
    methodName,
    block,
    onFailureBlock,
    onFailure = defaultOnFailure(methodName),
    accept = returnTrue,
    retryDelay = 100,
    initialDelay,
  } = options;

  if (typeof initialDelay === 'number') {
    await delay(initialDelay);
  }

  const start = Date.now();
  const criticalWebDriverErrors = ['NoSuchSessionError', 'NoSuchWindowError'];
  let lastError;
  const addText = (str: string | undefined) => (str ? ` waiting for '${str}'` : '');

  while (true) {
    // Aborting if timeout is reached
    if (Date.now() - start > timeout) {
      onFailure(lastError, `reached timeout ${timeout} ms${addText(description)}`);
    }
    // Aborting if WebDriver session is invalid or browser window is closed
    if (lastError && criticalWebDriverErrors.includes(lastError.name)) {
      throw new Error('WebDriver session is invalid, retry was aborted');
    }
    // Run opt-in onFailureBlock before the next attempt
    if (lastError && onFailureBlock) {
      const before = await runAttempt(onFailureBlock);
      if ('error' in before) log.debug(`--- onRetryBlock error: ${before.error.message}`);
    }

    const attempt = await runAttempt(block);

    if ('result' in attempt && accept(attempt.result)) {
      return attempt.result;
    }

    if ('error' in attempt) {
      if (lastError && lastError.message === attempt.error.message)
        log.debug(`--- ${methodName} failed again with the same message...`);
      else log.debug(`--- ${methodName} error: ${attempt.error.message}`);

      lastError = attempt.error;
    }

    await delay(retryDelay);
  }
}
