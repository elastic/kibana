/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { getSchemaAtPath } from './get_schema_at_path';
import { getShape } from './get_shape';
import { getShapeAt } from './get_shape_at';

interface BuildParamsSchemaOptions {
  /** The full request schema containing body, path, query, headers */
  requestSchema: z.ZodType;
  /** Additional schemas to merge into each variant (e.g., fetcher config) */
  additionalSchemas?: Record<string, z.ZodType>;
}

/**
 * Builds a paramsSchema from a request schema, properly handling union bodies.
 *
 * For schemas without union bodies: creates z.object({ ...body, ...path, ...query, ...additional })
 * For schemas with union bodies: creates z.union([
 *   z.object({ ...unionOption1, ...path, ...query, ...additional }),
 *   z.object({ ...unionOption2, ...path, ...query, ...additional }),
 *   ...
 * ])
 *
 * This preserves discriminated union semantics (e.g., alert vs user comment types)
 * instead of flattening all properties into a single object.
 */
export function buildParamsSchema({
  requestSchema,
  additionalSchemas = {},
}: BuildParamsSchemaOptions): z.ZodType {
  const bodySchema = getSchemaAtPath(requestSchema, 'body');
  const pathShape = getShapeAt(requestSchema, 'path');
  const queryShape = getShapeAt(requestSchema, 'query');

  if (bodySchema.schema instanceof z.ZodUnion && bodySchema.schema.options.length > 1) {
    // For union bodies, create a union of objects where each option
    // is merged with path, query, and additional schemas
    const unionOptions = bodySchema.schema.options.map((option) => {
      const optionShape = getShape(option as z.ZodType);
      return z.object({
        ...optionShape,
        ...pathShape,
        ...queryShape,
        ...additionalSchemas,
      });
    });

    return z.union(unionOptions);
  }

  // Regular case: merge all shapes into a single object
  return z.object({
    ...getShape(bodySchema.schema as z.ZodType),
    ...pathShape,
    ...queryShape,
    ...additionalSchemas,
  });
}
