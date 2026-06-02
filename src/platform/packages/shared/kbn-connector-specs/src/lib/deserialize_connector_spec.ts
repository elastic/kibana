/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ZodDiscriminatedUnion, ZodObject, type ZodRawShape } from '@kbn/zod/v4';
import { fromJSONSchema } from '@kbn/zod/v4/from_json_schema';

interface ConnectorShape {
  config: ZodObject<ZodRawShape>;
  secrets: ZodObject<ZodRawShape> | ZodDiscriminatedUnion;
}

export type ConnectorZodSchema = ZodObject<ZodRawShape> & {
  shape: ConnectorShape;
};

export function fromConnectorSpecSchema(
  jsonSchema: Record<string, unknown>
): ConnectorZodSchema | undefined {
  const schema = fromJSONSchema(jsonSchema, { preserveMeta: true });

  if (!schema || !(schema instanceof ZodObject)) {
    return undefined;
  }

  const { config, secrets } = schema.shape;
  const hasValidSecrets = secrets instanceof ZodObject || secrets instanceof ZodDiscriminatedUnion;

  if (!(config instanceof ZodObject) || !hasValidSecrets) {
    return undefined;
  }
  return schema.strict() as ConnectorZodSchema;
}
