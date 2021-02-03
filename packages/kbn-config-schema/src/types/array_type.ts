/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import typeDetect from 'type-detect';
import { internals } from '../internals';
import { Type, TypeOptions } from './type';

export type ArrayOptions<T> = TypeOptions<T[]> & {
  minSize?: number;
  maxSize?: number;
};

export class ArrayType<T> extends Type<T[]> {
  constructor(type: Type<T>, options: ArrayOptions<T> = {}) {
    let schema = internals.array().items(type.getSchema().optional()).sparse(false);

    if (options.minSize !== undefined) {
      schema = schema.min(options.minSize);
    }

    if (options.maxSize !== undefined) {
      schema = schema.max(options.maxSize);
    }

    super(schema, options);
  }

  protected handleError(type: string, { limit, reason, value }: Record<string, any>) {
    switch (type) {
      case 'any.required':
      case 'array.base':
        return `expected value of type [array] but got [${typeDetect(value)}]`;
      case 'array.sparse':
        return `sparse array are not allowed`;
      case 'array.parse':
        return `could not parse array value from json input`;
      case 'array.min':
        return `array size is [${value.length}], but cannot be smaller than [${limit}]`;
      case 'array.max':
        return `array size is [${value.length}], but cannot be greater than [${limit}]`;
      case 'array.includesOne':
        return reason[0];
    }
  }
}
