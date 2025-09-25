/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Type } from '../../types/type';

/*
 * This `SchemaOf` is meant to allow driving schemas based on TS types.
 * The difficulty is that it's hard to build up the shape of the schema perfectly,
 * in order to match the expected schema.
 *
 * This is a loose type to derive a schema that mostly matches the expected type.
 */

/**
 * Schema type derived from *output* type. Should be used with `satisfies` to infer the correct schema type.
 *
 * Limitations:
 * - Does **not** support input types (i.e. input === output).
 * - May not cover all cases perfectly.
 *
 * @example
 * ```ts
 * interface MySchemaOutput {
 *    name: string;
 *    age: number;
 *  }
 *
 *  const mySchema = schema.object({
 *    name: schema.string(),
 *    age: schema.number(),
 *  }) satisfies SchemaOf<MySchemaOutput>;
 * ```
 */
export type SchemaOf<Output, Input = any> = Type<Output, Input>;
