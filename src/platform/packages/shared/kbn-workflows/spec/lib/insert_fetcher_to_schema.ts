/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { FetcherConfigSchema } from '../schema';

const MAX_RECURSION_DEPTH = 10;

export function insertFetcherToSchemaRecursively(schema: z.ZodType, depth: number = 0): z.ZodType {
  if (depth > MAX_RECURSION_DEPTH) {
    return schema;
  }
  if (schema instanceof z.ZodObject) {
    return schema.extend({
      fetcher: FetcherConfigSchema,
    });
  }
  if (schema instanceof z.ZodUnion) {
    return z.union(
      schema.options.map((option) =>
        insertFetcherToSchemaRecursively(option as z.ZodType, depth + 1)
      )
    );
  }
  return schema;
}
