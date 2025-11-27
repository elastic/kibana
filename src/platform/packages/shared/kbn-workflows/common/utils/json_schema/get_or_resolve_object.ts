/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JSONSchema } from '@kbn/zod/v4/core';
import { resolveReferenceObject } from './resolve_reference_object';

type Object = JSONSchema.JSONSchema | { $ref: string };

export function getOrResolveObject<T = JSONSchema.JSONSchema>(
  object: Object,
  schema: JSONSchema.JSONSchema
): T | null {
  if ('$ref' in object && object.$ref && object.$ref.startsWith('#')) {
    return resolveReferenceObject(object.$ref, schema) as T | null;
  }
  return object as T | null;
}
