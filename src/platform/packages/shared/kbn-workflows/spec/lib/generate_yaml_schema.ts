/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  BaseConnectorStepSchema,
  BaseStepSchema,
  getForEachStepSchema,
  getHttpStepSchema,
  getIfStepSchema,
  getMergeStepSchema,
  getOnFailureStepSchema,
  getParallelStepSchema,
  getWorkflowSettingsSchema,
  WaitStepSchema,
  WorkflowSchema,
} from '../schema';

export interface ConnectorContract {
  type: string;
  paramsSchema: z.ZodType;
  connectorIdRequired?: boolean;
  outputSchema: z.ZodType;
  description?: string;
}

export interface InternalConnectorContract extends ConnectorContract {
  /** HTTP method(s) for this API endpoint */
  methods?: string[];
  /** URL pattern(s) for this API endpoint */
  patterns?: string[];
  /** Whether this is an internal connector with hardcoded endpoint details */
  isInternal?: boolean;
  /** Documentation URL for this API endpoint */
  documentation?: string | null;
  /** Parameter type metadata for proper request building */
  parameterTypes?: {
    pathParams?: string[];
    urlParams?: string[];
    bodyParams?: string[];
  };
}

function createRecursiveStepSchema(
  connectors: ConnectorContract[],
  loose: boolean = false
): z.ZodType {
  const stepSchema: z.ZodType = z.lazy(() => {
    // Create step schemas with the recursive reference
    const forEachSchema = getForEachStepSchema(stepSchema, loose);
    const ifSchema = getIfStepSchema(stepSchema, loose);
    const parallelSchema = getParallelStepSchema(stepSchema, loose);
    const mergeSchema = getMergeStepSchema(stepSchema, loose);
    const httpSchema = getHttpStepSchema(stepSchema, loose);

    // Create individual connector schemas for proper validation
    // This gives us proper schema validation per connector type
    const connectorSchemas = connectors.map((c) =>
      BaseConnectorStepSchema.extend({
        type: z.literal(c.type),
        'connector-id': c.connectorIdRequired ? z.string() : z.string().optional(),
        with: c.paramsSchema,
        'on-failure': getOnFailureStepSchema(stepSchema, loose).optional(),
      })
    );

    // Return discriminated union with all step types
    return z.discriminatedUnion('type', [
      forEachSchema,
      ifSchema,
      parallelSchema,
      mergeSchema,
      WaitStepSchema,
      httpSchema,
      ...connectorSchemas,
    ]);
  });

  return stepSchema;
}

export function generateYamlSchemaFromConnectors(
  connectors: ConnectorContract[],
  loose: boolean = false
) {
  const recursiveStepSchema = createRecursiveStepSchema(connectors, loose);

  if (loose) {
    return WorkflowSchema.partial().extend({
      steps: z.array(recursiveStepSchema).optional(),
    });
  }

  return WorkflowSchema.extend({
    settings: getWorkflowSettingsSchema(BaseStepSchema, loose).optional(), // Use BaseStepSchema to avoid circular reference
    steps: z.array(recursiveStepSchema),
  });
}

export function getJsonSchemaFromYamlSchema(yamlSchema: z.ZodType) {
  return zodToJsonSchema(yamlSchema, {
    name: 'WorkflowSchema',
  });
}

export function getStepId(stepName: string): string {
  return stepName.toLowerCase().replace(/\s+/g, '-');
}
