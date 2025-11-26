/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StepHandler } from '@kbn/workflows-extensions/server';

// Handler function that sets the variables
export const setVarStepHandler: StepHandler = async (context) => {
  try {
    const { variables } = context.input;

    // Store variables in step state so they can be accessed via {{ steps.stepName.key }}
    context.contextManager.setStepState(variables);

    const variableNames = Object.keys(variables);

    context.logger.debug(`Successfully set ${variableNames.length} variable(s)`, {
      variables: variableNames,
    });

    return { output: { success: true, variablesSet: variableNames } };
  } catch (error) {
    context.logger.error('Failed to set variables', error);
    return { error: new Error(error instanceof Error ? error.message : 'Failed to set variables') };
  }
};
