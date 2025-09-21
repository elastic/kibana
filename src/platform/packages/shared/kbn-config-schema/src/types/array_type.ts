/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import typeDetect from 'type-detect';
import { internals } from '../internals';
import type {
  TypeOptions,
  ExtendsDeepOptions,
  UnknownOptions,
  DefaultValue,
  SomeType,
} from './type';
import { Type } from './type';

export type ArrayOptions<
  T extends SomeType,
  D extends DefaultValue<T['_input'][]> = never
> = TypeOptions<T['_output'][], T['_input'][], D> &
  UnknownOptions & {
    minSize?: number;
    maxSize?: number;
  };

export class ArrayType<
  T extends SomeType,
  D extends DefaultValue<T['_input'][]> = never
> extends Type<T['_output'][], T['_input'][], D> {
  private readonly itemType: T;
  private readonly arrayOptions: ArrayOptions<T, D>;

  constructor(type: T, options: ArrayOptions<T, D> = {}) {
    let schema = internals.array().items(type.getSchema().optional()).sparse(false);

    if (options.minSize !== undefined) {
      schema = schema.min(options.minSize);
    }

    if (options.maxSize !== undefined) {
      schema = schema.max(options.maxSize);
    }

    // Only set stripUnknown if we have an explicit value of unknowns
    const { unknowns } = options;
    if (unknowns) {
      schema = schema.options({ stripUnknown: { objects: unknowns === 'ignore' } });
    }

    super(schema, options);
    this.itemType = type;
    this.arrayOptions = options;
  }

  public extendsDeep(options: ExtendsDeepOptions): ArrayType<T, D> {
    const newItemType = this.itemType.extendsDeep(options) as T;
    return new ArrayType(newItemType, this.arrayOptions);
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
