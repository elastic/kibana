/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import typeDetect from 'type-detect';
import { SchemaTypeError, SchemaTypesError } from '../errors';
import { internals } from '../internals';
import { Type, TypeOptions, ExtendsDeepOptions } from './type';

export type UnionTypeOptions<T> = Omit<TypeOptions<T>, 'id'>;

export class UnionType<RTS extends Array<Type<any>>, T> extends Type<T> {
  private readonly unionTypes: RTS;
  private readonly typeOptions?: UnionTypeOptions<T>;

  constructor(types: RTS, options?: UnionTypeOptions<T>) {
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
