/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ObjectType, ObjectInputType, ObjectOutputType } from './object_type';
import type { Type } from './type';

/**
 * Schema type derived from *output* type.
 *
 * Limitations:
 * - Does **not** support input types (i.e. input === output).
 * - May not cover all cases perfectly.
 *
 * @example
 * ```ts
 * interface MySchemaOutput {
 *    name: string;
 *    age?: number;
 *  }
 *
 *  const mySchema: SchemaOf<MySchemaOutput> = schema.object({
 *    name: schema.string(),
 *    age: schema.maybe(schema.number()),
 *  });
 * ```
 */
export type SchemaOf<T> = [T] extends [object]
  ? ObjectType<
      {
        [k in keyof Required<T>]: SchemaOf<T[k]>;
      },
      ObjectOutputType<{
        [k in keyof Required<T>]: SchemaOf<T[k]>;
      }>,
      ObjectInputType<{
        [k in keyof Required<T>]: SchemaOf<T[k]>;
      }>
    >
  : Type<T, T, T>;
