/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const SCRIPT_OUT_OF_MEMORY_MESSAGE = 'Script failed due to out of memory';

const CATASTROPHIC_ERROR_PREFIX = 'Script isolate encountered a catastrophic error';

const isOutOfMemoryErrorMessage = (message: string): boolean =>
  message.includes('Isolate was disposed during execution due to memory limit') ||
  message.includes('Array buffer allocation failed') ||
  (message.startsWith(CATASTROPHIC_ERROR_PREFIX) && /out of memory/i.test(message));

export const normalizeIsolateExecutionError = (error: unknown): Error => {
  if (error instanceof Error) {
    if (isOutOfMemoryErrorMessage(error.message)) {
      return new Error(SCRIPT_OUT_OF_MEMORY_MESSAGE);
    }

    return error;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    if (isOutOfMemoryErrorMessage(error.message)) {
      return new Error(SCRIPT_OUT_OF_MEMORY_MESSAGE);
    }

    return new Error(error.message);
  }

  return new Error('Script execution failed');
};
