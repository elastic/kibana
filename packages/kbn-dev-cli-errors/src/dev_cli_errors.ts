/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { inspect } from 'util';

const FAIL_TAG = Symbol('fail error');

interface FailError extends Error {
  exitCode: number;
  showHelp: boolean;
  [FAIL_TAG]: true;
}

interface FailErrorOptions {
  exitCode?: number;
  showHelp?: boolean;
}

export function createFailError(reason: string, options: FailErrorOptions = {}): FailError {
  const { exitCode = 1, showHelp = false } = options;

  return Object.assign(new Error(reason), {
    exitCode,
    showHelp,
    [FAIL_TAG]: true as true,
  });
}

export function createFlagError(reason: string) {
  return createFailError(reason, {
    showHelp: true,
  });
}

export function isFailError(error: any): error is FailError {
  return Boolean(error && error[FAIL_TAG]);
}

export function combineErrors(errors: Array<Error | FailError>) {
  if (errors.length === 1) {
    return errors[0];
  }

  const exitCode = errors
    .filter(isFailError)
    .reduce((acc, error) => Math.max(acc, error.exitCode), 1);

  const showHelp = errors.some((error) => isFailError(error) && error.showHelp);

  const message = errors.reduce((acc, error) => {
    if (isFailError(error)) {
      return acc + '\n' + error.message;
    }

    return acc + `\nUNHANDLED ERROR\n${inspect(error)}`;
  }, '');

  return createFailError(`${errors.length} errors:\n${message}`, {
    exitCode,
    showHelp,
  });
}
