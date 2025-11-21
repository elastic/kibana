/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ZodType } from '@kbn/zod/v4';

// copied from zod
export type ZodTypeKind =
  | 'string'
  | 'number'
  | 'int'
  | 'boolean'
  | 'bigint'
  | 'symbol'
  | 'null'
  | 'undefined'
  | 'void'
  | 'never'
  | 'any'
  | 'unknown'
  | 'date'
  | 'object'
  | 'record'
  | 'file'
  | 'array'
  | 'tuple'
  | 'union'
  | 'intersection'
  | 'map'
  | 'set'
  | 'enum'
  | 'literal'
  | 'nullable'
  | 'optional'
  | 'nonoptional'
  | 'success'
  | 'transform'
  | 'default'
  | 'prefault'
  | 'catch'
  | 'nan'
  | 'pipe'
  | 'readonly'
  | 'template_literal'
  | 'promise'
  | 'lazy'
  | 'custom';

export function getZodSchemaType(schema: ZodType): ZodTypeKind {
  if (!schema || !schema.def) {
    return 'unknown';
  }

  return schema.def.type;
}
