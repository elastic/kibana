/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import typeDetect from 'type-detect';
import { SchemaTypeError, SchemaTypesError } from '../errors';
import { internals } from '../internals';
import type { DefaultValue, ExtendsDeepOptions } from './type';
import { Type, type TypeOptions, type TypeMeta } from './type';
import type {
  ObjectProps,
  Props,
  ObjectDefaultValue,
  ObjectResultTypeInput,
  ObjectResultDefaults,
  ObjectResultType,
} from './object_type';

// complex types here mostly due to mixing `Type` and `ObjectType`

export type UnionTypeOptions<T, D extends DefaultValue<any>> = Omit<
  TypeOptions<UnionResolvedValue<T>, D>,
  'meta'
> & {
  meta?: Omit<TypeMeta, 'id'>;
};

export type UnionTypeDefaultValue<T extends any | ObjectProps<Props>> = T extends ObjectProps<Props>
  ? ObjectDefaultValue<T>
  : DefaultValue<T>;

/**
 * Resolves the correct default value from `V`.
 *
 * For simple `Type` `T` is the raw value. For `ObjectType` `T` is the schema stucture which needs to be converted.
 */
export type UnionResolvedValue<T extends any | ObjectProps<Props>> = T extends ObjectProps<Props>
  ? ObjectResultTypeInput<T>
  : T;

/**
 * Resolves the correct default value from `D`.
 *
 * If `never` we need to return the default based on the original `T` for each type in the `oneOf` array.
 *
 * Otherwise, return `D` as is.
 */
export type UnionDefaultValue<T, D extends DefaultValue<T>> = [D] extends [never]
  ? T extends ObjectResultType<infer P>
    ? ObjectResultDefaults<P>
    : T
  : D;

export type UnionBaseType<T extends any, D extends DefaultValue<T>> = [D] extends [never]
  ? Type<T, DefaultValue<T>>
  : [D] extends [DefaultValue<T>]
  ? Type<T, D | DefaultValue<T>>
  : never;

export class UnionType<
  RTS extends Array<Type<any>>,
  T extends any | ObjectProps<Props>,
  D extends UnionTypeDefaultValue<T>
> extends Type<T, D> {
  private readonly unionTypes: RTS;
  private readonly typeOptions?: UnionTypeOptions<T, D>;

  constructor(types: RTS, options?: UnionTypeOptions<T, D>) {
    const schema = internals.alternatives(types.map((type) => type.getSchema())).match('any');

    super(schema, options);
    this.unionTypes = types;
    this.typeOptions = options;
  }

  public extendsDeep(options: ExtendsDeepOptions) {
    return new UnionType(
      this.unionTypes.map((t) => t.extendsDeep(options)),
      this.typeOptions
    );
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
