/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { setVarStepCommonDefinition } from '../../common/step_types/setvat_step';

// Using createServerStepDefinition for automatically inferring input and output types from the schemas in setVarStepCommonDefinition
// No need to explicitly specify SetVarStepInput and SetVarStepOutput types
export const setVarStepDefinition = createServerStepDefinition({
  ...setVarStepCommonDefinition,
  handler: async (context) => {
    try {
      const { variables } = context.input;

      const variableNames = Object.keys(variables);

      context.logger.debug(`Successfully set ${variableNames.length} variable(s)`, {
        variables: variableNames,
      });

      return { output: { variables } };
    } catch (error) {
      context.logger.error('Failed to set variables', error);
      return {
        error: new Error(error instanceof Error ? error.message : 'Failed to set variables'),
      };
    }
  },
});
