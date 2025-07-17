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
  WorkflowSchema,
  getForEachStepSchema,
  getIfStepSchema,
  getParallelStepSchema,
  getMergeStepSchema,
  WorkflowYamlSchema,
} from '../schema';

export interface ConnectorContract {
  type: string;
  params: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object';
  }>;
}

function getZodTypeForParam(param: ConnectorContract['params'][number]) {
  switch (param.type) {
    case 'string':
      return z.string();
    case 'number':
      return z.number();
    case 'boolean':
      return z.boolean();
    case 'object':
      return z.record(z.string(), z.any());
    default:
      return z.string();
  }
}

function generateStepSchemaForConnector(connector: ConnectorContract) {
  const paramSchema = connector.params.reduce((acc, param) => {
    acc[param.name] = getZodTypeForParam(param);
    return acc;
  }, {} as Record<string, z.ZodType>);

  return BaseConnectorStepSchema.extend({
    type: z.literal(connector.type),
    with: z.object(paramSchema).optional(),
  });
}

function createRecursiveStepSchema(connectors: ConnectorContract[]): z.ZodType {
  const connectorSchemas = connectors.map(generateStepSchemaForConnector);

  const stepSchema: z.ZodType = z.lazy(() => {
    // Create step schemas with the recursive reference
    const forEachSchema = getForEachStepSchema(stepSchema);
    const ifSchema = getIfStepSchema(stepSchema);
    const parallelSchema = getParallelStepSchema(stepSchema);
    const mergeSchema = getMergeStepSchema(stepSchema);

    // Return discriminated union with all step types
    return z.discriminatedUnion('type', [
      forEachSchema,
      ifSchema,
      parallelSchema,
      mergeSchema,
      ...connectorSchemas,
    ] as const);
  });

  return stepSchema;
}

export function generateYamlSchemaFromConnectors(
  connectors: ConnectorContract[],
  loose: boolean = false
) {
  const recursiveStepSchema = createRecursiveStepSchema(connectors);

  if (loose) {
    return z.object({
      version: WorkflowYamlSchema.shape.version,
      workflow: WorkflowSchema.partial().extend({
        steps: z.array(recursiveStepSchema).optional(),
      }),
    });
  }

  return z.object({
    version: WorkflowYamlSchema.shape.version,
    workflow: WorkflowSchema.extend({
      steps: z.array(recursiveStepSchema),
    }),
  });
}

export function getJsonSchemaFromYamlSchema(yamlSchema: z.ZodType) {
  return zodToJsonSchema(yamlSchema, {
    name: 'WorkflowSchema',
  });
}
