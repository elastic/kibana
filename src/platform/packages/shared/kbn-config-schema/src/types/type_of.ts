/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SomeType, TypeOrLazyType } from './type';

/**
 * Resulting schema type.
 *
 * @alias `TypeOfOutput`
 * @example
 * ```ts
 * const mySchema = schema.object({ num: schema.number() });
 *
 * const MySchemaType = TypeOf<typeof mySchema>;
 * ```
 */
export type TypeOf<RT extends TypeOrLazyType> = TypeOfOutput<RT>;

/**
 * Output type of schema after all defaults are applied.
 *
 * @example
 * ```ts
 * const mySchema = schema.object({ num: schema.number() });
 *
 * const MySchemaType = TypeOfOutput<typeof mySchema>;
 * ```
 */
export type TypeOfOutput<RT extends TypeOrLazyType> = RT extends () => SomeType
  ? ReturnType<RT>['_output']
  : RT extends SomeType
  ? RT['_output']
  : never;

/**
 * Output type of schema after all defaults are applied.
 *
 * @example
 * ```ts
 * const mySchema = schema.object({ num: schema.number() });
 *
 * const MySchemaType = TypeOfOutput<typeof mySchema>;
 * ```
 */
export type TypeOfInput<RT extends TypeOrLazyType> = RT extends SomeType ? RT['_input'] : never;
