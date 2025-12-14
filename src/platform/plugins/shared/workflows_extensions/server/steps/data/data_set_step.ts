/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataSetStepCommonDefinition } from '../../../common/steps/data';
import { createServerStepDefinition } from '../../step_registry/types';

export const dataSetStepDefinition = createServerStepDefinition({
  ...dataSetStepCommonDefinition,
  handler: async (context) => {
    try {
      const variableCount = Object.keys(context.input).length;

      context.logger.debug(`Set ${variableCount} variable(s)`, {
        variables: Object.keys(context.input),
      });

      context.contextManager.setVariables(context.input);

      return { output: context.input };
    } catch (error) {
      context.logger.error('Failed to set variables', error);
      return {
        error: new Error(error instanceof Error ? error.message : 'Failed to set variables'),
      };
    }
  },
});
