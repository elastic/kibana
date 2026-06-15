/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { executeScriptInIsolate } from './execute_script_in_isolate';
import { scriptsJavaScriptStepCommonDefinition } from '../../../../common/steps/scripts/javascript';
import { createServerStepDefinition } from '../../../step_registry/types';

export const SCRIPT_MEMORY_LIMIT_MB = 8;
export const SCRIPT_EXECUTION_TIMEOUT_MS = 5_000;
export const MAX_CONSOLE_LOG_COUNT = 100;
export const SCRIPT_MAX_LENGTH_CHARS = 1 * 1024 * 1024; // 1 MB after Liquid template rendering

const toExecutionError = (error: unknown, aborted: boolean): Error => {
  if (aborted) {
    return new Error('Step execution was cancelled');
  }

  if (error instanceof Error) {
    return error;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return new Error(error.message);
  }

  return new Error('Script execution failed');
};

export const scriptsJavaScriptStepDefinition = createServerStepDefinition({
  ...scriptsJavaScriptStepCommonDefinition,
  handler: async (context) => {
    const { script } = context.config;

    if (typeof script !== 'string' || script.trim().length === 0) {
      return { error: new Error('Script is required') };
    }

    if (script.length > SCRIPT_MAX_LENGTH_CHARS) {
      return {
        error: new Error(
          `Script exceeds maximum allowed size of ${
            SCRIPT_MAX_LENGTH_CHARS / 1024 / 1024
          } MB after template rendering. Current size: ${(script.length / 1024 / 1024).toFixed(
            2
          )} MB. Reduce interpolated data or split the workflow.`
        ),
      };
    }

    try {
      const output = await executeScriptInIsolate({
        script,
        logger: context.logger,
        abortSignal: context.abortSignal,
        memoryLimitMb: SCRIPT_MEMORY_LIMIT_MB,
        executionTimeoutMs: SCRIPT_EXECUTION_TIMEOUT_MS,
        maxConsoleLogCount: MAX_CONSOLE_LOG_COUNT,
      });

      return { output };
    } catch (error) {
      return {
        error: toExecutionError(error, context.abortSignal.aborted),
      };
    }
  },
});
