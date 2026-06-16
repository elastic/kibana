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
import { buildFieldsZodValidator } from '@kbn/workflows/spec/lib/build_fields_zod_validator';
import type { JsonModelSchemaType } from '@kbn/workflows/spec/schema/common/json_model_schema';
import { z } from '@kbn/zod/v4';
import { structuralStepOutputSchemas } from './structural_step_output_schemas';
import { stepSchemas } from '../../../../common/step_schemas';

const waitForInputExternalSchema = z.object({
  apiKeyId: z.string(),
  expiresAt: z.string().optional(),
  resumeUrl: z.string(),
  ttl: z.string(),
});

const waitForInputFallbackInputSchema: z.ZodSchema = z.record(z.string(), z.unknown());

const createWaitForInputOutputSchema = (inputSchema: z.ZodSchema): z.ZodSchema =>
  z.object({
    external: waitForInputExternalSchema.optional(),
    input: inputSchema.optional(),
    resumedAt: z.string().optional(),
    resumedBy: z.string().optional(),
  });

export const getOutputSchemaForStepType = (node: GraphNodeUnion): z.ZodSchema => {
  // Handle internal actions with pattern matching first
  // TODO: add output schema support for elasticsearch.request and kibana.request connectors

  // waitForInput has a dynamic output schema derived from its with.schema field.
  // It is a built-in step so it is handled here directly rather than through the
  // extension registry (which is for user-space step types like data.map).
  if (node.stepType === 'waitForInput') {
    const jsonSchema =
      isAtomic(node) || 'configuration' in node
        ? ((node as { configuration?: { with?: { schema?: unknown } } }).configuration?.with
            ?.schema as Record<string, unknown> | undefined)
        : undefined;

    if (jsonSchema) {
      try {
        return createWaitForInputOutputSchema(
          buildFieldsZodValidator(jsonSchema as JsonModelSchemaType)
        );
      } catch {
        // fall through to permissive fallback
      }
    }
    return createWaitForInputOutputSchema(waitForInputFallbackInputSchema);
  }

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

  const structuralSchema = structuralStepOutputSchemas[node.stepType];
  if (structuralSchema) {
    return structuralSchema;
  }

  // Fallback to unknown if not found
  return z.unknown();
};
