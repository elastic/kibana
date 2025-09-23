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
import type { DefaultValue, ExtendsDeepOptions, SomeType } from './type';
import { Type, type TypeOptions, type TypeMeta } from './type';

export type UnionTypeOptions<
  T extends Readonly<[SomeType, ...SomeType[]]>,
  D extends DefaultValue<T[number]['_input']> = never
> = TypeOptions<T[number]['_output'], T[number]['_input'], D> & {
  meta?: Omit<TypeMeta, 'id'>;
};

export class UnionType<
  T extends Readonly<[SomeType, ...SomeType[]]>,
  D extends DefaultValue<T[number]['_input']> = never
> extends Type<T[number]['_output'], T[number]['_input'], D> {
  private readonly unionTypes: T;
  private readonly typeOptions?: UnionTypeOptions<T, D>;

  constructor(types: T, options?: UnionTypeOptions<T, D>) {
    const schema = internals.alternatives(types.map((type) => type.getSchema())).match('any');

    super(schema, options);
    this.unionTypes = types;
    this.typeOptions = options;
  }

  public extendsDeep(options: ExtendsDeepOptions) {
    const newTypes = this.unionTypes.map((t) => t.extendsDeep(options)) as any;
    return new UnionType(newTypes, this.typeOptions);
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
