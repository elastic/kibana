/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ObjectTypeOptions, SomeObjectType } from './object_type';
import { ObjectType } from './object_type';
import type { SomeType } from './type';

export type IntersectionInput<T extends Readonly<[SomeObjectType, ...SomeObjectType[]]>> =
  T extends readonly [infer First, ...infer Rest]
    ? First extends SomeObjectType
      ? Rest extends readonly [SomeObjectType, ...SomeObjectType[]]
        ? First['_input'] & IntersectionInput<Rest>
        : First['_input']
      : never
    : never;

export type IntersectionOutput<T extends Readonly<[SomeObjectType, ...SomeObjectType[]]>> =
  T extends readonly [infer First, ...infer Rest]
    ? First extends SomeObjectType
      ? Rest extends readonly [SomeObjectType, ...SomeObjectType[]]
        ? First['_output'] & IntersectionOutput<Rest>
        : First['_output']
      : never
    : never;

export class IntersectionType<
  T extends Readonly<[SomeObjectType, ...SomeObjectType[]]>
> extends ObjectType<IntersectionOutput<T>, IntersectionInput<T>> {
  constructor(types: T, options?: ObjectTypeOptions<IntersectionOutput<T>, IntersectionInput<T>>) {
    const props = types.reduce((mergedProps, type) => {
      const typeProps = type.props as Record<string, SomeType>;
      Object.entries(typeProps).forEach(([key, value]) => {
        if (mergedProps[key] !== undefined) {
          throw new Error(`Duplicate key found in intersection: '${key}'`);
        }
        mergedProps[key] = value;
      });

      return mergedProps;
    }, {} as Record<string, SomeType>) as IntersectionOutput<T>;

    super(props, options as any);
  }
}
