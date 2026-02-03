/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { externalStepCommonDefinition } from '../../common/step_types/external_step';

// Using createServerStepDefinition for automatically inferring input and output types from the schemas in externalStepCommonDefinition
// No need to explicitly specify ExternalStepInput and ExternalStepOutput types
export const externalStepDefinition = createServerStepDefinition({
  ...externalStepCommonDefinition,
  handler: async (context) => {
    try {
      const { input } = context.input;

      context.logger.debug(`Successfully called external service`, {
        input,
      });

      return { output: { response: 'success' } };
    } catch (error) {
      context.logger.error('Failed to call external service', error);
      return {
        error: new Error(
          error instanceof Error ? error.message : 'Failed to call external service'
        ),
      };
    }
  },
});
