/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GraphNodeUnion } from '@kbn/workflows/graph';
import { isAtomic } from '@kbn/workflows/graph';
import { z } from '@kbn/zod/v4';
import { stepSchemas } from '../../../../common/step_schemas';

export const getOutputSchemaForStepType = (node: GraphNodeUnion): z.ZodSchema => {
  // Handle internal actions with pattern matching first
  // TODO: add output schema support for elasticsearch.request and kibana.request connectors

  if (isAtomic(node)) {
    const stepDefinition = stepSchemas.getStepDefinition(node.stepType);

    if (stepDefinition && stepSchemas.isPublicStepDefinition(stepDefinition)) {
      try {
        if (stepDefinition?.editorHandlers?.dynamicSchema?.getOutputSchema) {
          return stepDefinition.editorHandlers.dynamicSchema.getOutputSchema({
            input: node.configuration.with,
            config: node.configuration,
          });
        }
      } catch (error) {
        // If dynamic schema generation fails, fallback to static output schema
      }

      return stepDefinition.outputSchema;
    }
  }

  const allConnectorsMap = stepSchemas.getAllConnectorsMapCache();
  const connector = allConnectorsMap?.get(node.stepType);

  if (connector) {
    if (!connector.outputSchema) {
      // throw new Error(`Output schema not found for step type ${stepType}`);
      return z.unknown();
    }
    return connector.outputSchema;
  }

  // Fallback to unknown if not found
  return z.unknown();
};
