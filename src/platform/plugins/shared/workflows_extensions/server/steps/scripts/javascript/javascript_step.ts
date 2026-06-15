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

const toExecutionError = (error: unknown, aborted: boolean): Error => {
  if (aborted) {
    return new Error('Step execution was cancelled');
  }

  if (error instanceof Error) {
    return error;
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

    try {
      const output = await executeScriptInIsolate({
        script,
        context: context.contextManager.getContext(),
        logger: context.logger,
        abortSignal: context.abortSignal,
      });

      return { output };
    } catch (error) {
      return {
        error: toExecutionError(error, context.abortSignal.aborted),
      };
    }
  },
});
