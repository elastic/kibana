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
 * throughout the workflow using {{ steps.stepName.variableName }} syntax.
 *
 * Variables are stored in the step's state, making them accessible to all
 * subsequent steps in the workflow without requiring any changes to the
 * core workflow engine.
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
 *     type: console
 *     with:
 *       message: "Count: {{ steps.setVarStep.x }}, User: {{ steps.setVarStep.userName }}"
 * ```
 */
export const setvarStepDefinition: StepTypeDefinition = {
  id: 'setvar',
  title: 'Set Variable',
  description:
    'Define variables that can be accessed throughout the workflow via {{ steps.stepName.variableName }}',

  // Input schema: accepts a record of variable names to values
  inputSchema: z.object({
    variables: z.record(z.string(), z.any()).describe('Variables to set in the workflow context'),
  }),

  // Output schema: returns success status and the variables that were set
  outputSchema: z.object({
    success: z.boolean(),
    variablesSet: z.array(z.string()),
  }),

  // Documentation for UI hover
  documentation: {
    summary: 'Store values in step state for use throughout the workflow',
    details:
      "Variables are stored in the step's persistent state and can be accessed in subsequent steps using `{{ steps.stepName.variableName }}` syntax.",
    examples: [
      `- name: setVarStep
  type: setvar
  with:
    variables:
      x: 10
      userName: "Alice"
      isActive: true

- name: useVariable
  type: console
  with:
    message: "User {{ steps.setVarStep.userName }} has count {{ steps.setVarStep.x }}"`,
    ],
  },

  // Handler function that sets the variables
  handler: async (context) => {
    try {
      const { variables } = context.input;

      // Store variables in step state so they can be accessed via {{ steps.stepName.key }}
      await context.contextManager.setStepState(variables);

      const variableNames = Object.keys(variables);
      context.logger.debug(`Set ${variableNames.length} variable(s)`, {
        variables: variableNames,
      });

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
