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
import { getAllConnectorsInternal } from '../../../../common/schema';
import { stepSchemas } from '../../../../common/step_schemas';

export const getOutputSchemaForStepType = (node: GraphNodeUnion): z.ZodSchema => {
  // Handle internal actions with pattern matching first
  // TODO: add output schema support for elasticsearch.request and kibana.request connectors
  if (node.stepType.startsWith('elasticsearch.')) {
    return z.unknown();
  }

  if (node.stepType.startsWith('kibana.')) {
    return z.unknown();
  }

  if (isAtomic(node)) {
    const stepDefinition = stepSchemas.getStepDefinition(node.stepType);

    if (stepDefinition && stepSchemas.isPublicStepDefinition(stepDefinition)) {
      try {
        if (stepDefinition.dynamicOutputSchema) {
          return stepDefinition.dynamicOutputSchema(node.configuration.with);
        }
      } catch (error) {
        return stepDefinition.outputSchema;
      }

      return stepDefinition.outputSchema;
    }
  }

  const allConnectors = getAllConnectorsInternal();
  const connector = allConnectors.find((c) => c.type === node.stepType);

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
