/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

import { fromJSONSchema } from './from_json_schema';
export { fromJSONSchema, extractUiMeta, type JsonSchema } from './from_json_schema';

export interface ConnectorZodSchema extends z.ZodObject {
  shape: {
    config: z.ZodObject;
    secrets: z.ZodDiscriminatedUnion;
  };
}

export function isConnectorZodSchema(schema: z.ZodType | undefined): schema is ConnectorZodSchema {
  if (!schema || !(schema instanceof z.ZodObject)) {
    return false;
  }

  const shape = schema.shape as Record<string, z.ZodType> | undefined;
  if (!shape) {
    return false;
  }

  const hasConfig = 'config' in shape && shape.config instanceof z.ZodObject;
  const hasSecrets = 'secrets' in shape && shape.secrets instanceof z.ZodDiscriminatedUnion;

  return hasConfig && hasSecrets;
}

export function fromConnectorSpecSchema(
  jsonSchema: Record<string, unknown>
): ConnectorZodSchema | undefined {
  const schema = fromJSONSchema(jsonSchema);

  if (isConnectorZodSchema(schema)) {
    return schema;
  }

  return undefined;
}
