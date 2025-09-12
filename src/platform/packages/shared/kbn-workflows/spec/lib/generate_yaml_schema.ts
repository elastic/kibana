/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { zodToJsonSchema } from '@finom/zod-to-json-schema';
import {
  BaseConnectorStepSchema,
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
}

function generateStepSchemaForConnector(
  connector: ConnectorContract,
  stepSchema: z.ZodType,
  loose: boolean = false
) {
  return BaseConnectorStepSchema.extend({
    type: z.literal(connector.type),
    'connector-id': connector.connectorIdRequired ? z.string() : z.string().optional(),
    with: connector.paramsSchema,
    'on-failure': getOnFailureStepSchema(stepSchema, loose).optional(),
  });
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
    const connectorSchemas = connectors.map((c) =>
      generateStepSchemaForConnector(c, stepSchema, loose)
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
    settings: getWorkflowSettingsSchema(recursiveStepSchema, loose).optional(),
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
