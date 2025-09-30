/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type * as z from '@kbn/zod';

export function createIsNarrowSchema<TBaseSchema extends z.Schema, TNarrowSchema extends z.Schema>(
  _base: TBaseSchema,
  narrow: TNarrowSchema
) {
  return <TValue extends z.input<TBaseSchema>>(
    value: TValue
  ): value is Extract<TValue, z.input<TNarrowSchema>> => {
    return isSchema(narrow, value);
  };
}

export function isSchema<TSchema extends z.Schema>(
  schema: TSchema,
  value: unknown
): value is z.input<TSchema> {
  return schema.safeParse(value).success;
}
