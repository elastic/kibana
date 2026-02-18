/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ZodDiscriminatedUnion, ZodObject, type ZodType } from '@kbn/zod/v4';
import { fromJSONSchema } from '@kbn/zod/v4/from_json_schema';

interface ConnectorShape {
  config: ZodObject<Record<string, ZodType>>;
  secrets: ZodDiscriminatedUnion;
}

export type ConnectorZodSchema = ZodObject<ConnectorShape> & {
  shape: ConnectorShape;
};

export function fromConnectorSpecSchema(
  jsonSchema: Record<string, unknown>
): ConnectorZodSchema | undefined {
  const schema = fromJSONSchema(jsonSchema);

  if (
    !schema ||
    !(schema instanceof ZodObject) ||
    !schema.shape ||
    !('config' in schema.shape) ||
    !(schema.shape.config instanceof ZodObject) ||
    !('secrets' in schema.shape) ||
    !(schema.shape.secrets instanceof ZodDiscriminatedUnion)
  ) {
    return undefined;
  }

  return schema as ConnectorZodSchema;
}
