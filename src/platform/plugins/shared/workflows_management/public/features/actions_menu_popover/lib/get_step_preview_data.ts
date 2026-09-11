/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getBuiltInStepDefinition } from '@kbn/workflows';
import type { z } from '@kbn/zod/v4';
import { stepSchemas } from '../../../../common/step_schemas';

export interface StepPreviewData {
  inputSchema?: z.ZodType;
  outputSchema?: z.ZodType;
  examples: string[];
  documentationUrl?: string;
}

/** Gets normalized preview data for a built-in, registered, or connector step. */
export const getStepPreviewData = (stepId: string): StepPreviewData => {
  const builtInDefinition = getBuiltInStepDefinition(stepId);
  if (builtInDefinition) {
    return {
      inputSchema: builtInDefinition.inputSchema,
      outputSchema: builtInDefinition.outputSchema,
      examples: builtInDefinition.documentation?.examples ?? [],
      documentationUrl: builtInDefinition.documentation?.url,
    };
  }

  const registeredDefinition = stepSchemas.getStepDefinition(stepId);
  if (registeredDefinition && stepSchemas.isPublicStepDefinition(registeredDefinition)) {
    return {
      inputSchema: registeredDefinition.inputSchema,
      outputSchema: registeredDefinition.outputSchema,
      examples: registeredDefinition.documentation?.examples ?? [],
      documentationUrl: registeredDefinition.documentation?.url,
    };
  }

  const connectorDefinition = stepSchemas.getAllConnectorsMapCache()?.get(stepId);
  return {
    inputSchema: connectorDefinition?.paramsSchema,
    outputSchema: connectorDefinition?.outputSchema,
    examples: connectorDefinition?.examples?.snippet ? [connectorDefinition.examples.snippet] : [],
    documentationUrl: connectorDefinition?.documentation ?? undefined,
  };
};
