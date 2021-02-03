/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import typeDetect from 'type-detect';
import { SchemaTypeError, SchemaTypesError } from '../errors';
import { internals } from '../internals';
import { Type, TypeOptions } from './type';

export class UnionType<RTS extends Array<Type<any>>, T> extends Type<T> {
  constructor(types: RTS, options?: TypeOptions<T>) {
    const schema = internals.alternatives(types.map((type) => type.getSchema()));

    super(schema, options);
  }

  protected handleError(type: string, { reason, value }: Record<string, any>, path: string[]) {
    switch (type) {
      case 'any.required':
        return `expected at least one defined value but got [${typeDetect(value)}]`;
      case 'alternatives.child':
        return new SchemaTypesError(
          'types that failed validation:',
          path,
          reason.map((e: SchemaTypeError, index: number) => {
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
