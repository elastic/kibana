/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ObjectType } from '@kbn/config-schema';
import { Type } from '@kbn/config-schema';
import { internals } from '@kbn/config-schema/src/internals';
import type { ObjectResultType, Props, TypeOptions } from '@kbn/config-schema/src/types';
import { SchemaTypeError, SchemaTypesError } from '@kbn/config-schema/src/errors';
import typeDetect from 'type-detect';

type SomeObjectType = ObjectType<any>;

/**
 * A custom schema type used in lens for object unions with ability to extend
 */
export function objectUnion<T extends [SomeObjectType, ...SomeObjectType[]]>(
  types: T,
  options?: TypeOptions<T[number]['type']>
) {
  return new ObjectUnionType(types, options);
}

/**
 * Extends `Type` with duplicate logic from `UnionType` from `@kbn/config-schema`
 */
export class ObjectUnionType<RTS extends Array<SomeObjectType>, T> extends Type<T> {
  private readonly unionTypes: RTS;
  private readonly typeOptions?: TypeOptions<T>;

  constructor(types: RTS, options?: TypeOptions<T>) {
    let schema = internals.alternatives(types.map((type) => type.getSchema())).match('any');

    if (options?.meta?.id) {
      schema = schema.id(options.meta.id);
    }

    super(schema, options);
    this.unionTypes = types;
    this.typeOptions = options;
  }

  /**
   * Returns generic schema type
   *
   * All `@kbn/config-schema` types are either `Type` or `ObjectType` but this limits the extension of custom
   * types as this would wipe away custom methods and overrides.
   */
  public toType(): Type<T> {
    return this;
  }

  /**
   * Use this to merge one union type with another
   *
   * @example
   * ```ts
   * const union = objectUnion([type1, type2]);
   * const newUnion = objectUnion([...union.getUnionTypes(), type3]);
   * ```
   */
  public getUnionTypes() {
    return this.unionTypes;
  }

  public extends<P extends Props>(props: P, options?: TypeOptions<ObjectResultType<P> & T>) {
    const newTypes = this.unionTypes.map((t) => {
      return t.extends(props); // no overriding type.options
    }) as RTS; // these types are correct but need to be forced to work
    const newOptions = {
      ...this.typeOptions,
      ...options,
    } as TypeOptions<ObjectResultType<P> & T>;
    return new ObjectUnionType<RTS, ObjectResultType<P> & T>(newTypes, newOptions);
  }

  protected handleError(type: string, { value, details }: Record<string, any>, path: string[]) {
    switch (type) {
      case 'any.required':
        return `expected at least one defined value but got [${typeDetect(value)}]`;
      case 'alternatives.match':
        return new SchemaTypesError(
          'types that failed validation:',
          path,
          details.map((detail: AlternativeErrorDetail, index: number) => {
            const e = detail.context.error;
            const childPathWithIndex = e.path.slice();
            childPathWithIndex.splice(path.length, 0, index.toString());

            return e instanceof SchemaTypesError
              ? new SchemaTypesError(e.message, childPathWithIndex, e.errors)
              : new SchemaTypeError(e.message, childPathWithIndex);
          })
        );
    }
  }
}

interface AlternativeErrorDetail {
  context: {
    error: SchemaTypeError;
  };
}
