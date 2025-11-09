/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import type { StepTypeDefinition } from '@kbn/workflows';

/**
 * Set Variable Step
 *
 * This step type allows users to define variables that can be accessed
 * throughout the workflow using {{ variables.variableName }} syntax.
 *
 * Example usage in workflow YAML:
 * ```yaml
 * steps:
 *   - name: setVarStep
 *     type: setvar
 *     with:
 *       variables:
 *         x: 10
 *         userName: "Alice"
 *         isActive: true
 *
 *   - name: useVariable
 *     type: http
 *     with:
 *       url: "https://api.example.com/user"
 *       body:
 *         count: "{{ variables.x }}"
 *         name: "{{ variables.userName }}"
 * ```
 */
export const setvarStepDefinition: StepTypeDefinition = {
  id: 'setvar',
  title: 'Set Variable',
  description:
    'Define variables that can be accessed throughout the workflow via {{ variables.variableName }}',

  // Input schema: accepts a record of variable names to values
  inputSchema: z.object({
    variables: z.record(z.string(), z.any()).describe('Variables to set in the workflow context'),
  }),

  // Output schema: returns success status and the variables that were set
  outputSchema: z.object({
    success: z.boolean(),
    variablesSet: z.array(z.string()),
  }),

  // Handler function that sets the variables
  handler: async (context) => {
    try {
      const { variables } = context.input;

      // Set each variable in the workflow context
      const variableNames: string[] = [];
      for (const [key, value] of Object.entries(variables)) {
        context.contextManager.setVariable(key, value);
        variableNames.push(key);
        context.logger.debug(`Set variable: ${key}`, { value });
      }

      context.logger.info(`Successfully set ${variableNames.length} variable(s)`, {
        variables: variableNames,
      });

      return {
        output: {
          success: true,
          variablesSet: variableNames,
        },
      };
    } catch (error) {
      context.logger.error('Failed to set variables', { error });
      return {
        error: {
          message: error instanceof Error ? error.message : 'Failed to set variables',
          details: error,
        },
      };
    }
  },
};

