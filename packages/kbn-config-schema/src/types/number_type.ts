/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import typeDetect from 'type-detect';
import { internals } from '../internals';
import { Type, TypeOptions } from './type';

export type NumberOptions = TypeOptions<number> & {
  min?: number;
  max?: number;
  /**
   * When set to true, will accept unsafe numbers (integers > 2^53).
   * Otherwise, unsafe numbers will fail validation.
   * Default: `false`
   */
  unsafe?: boolean;
};

export class NumberType extends Type<number> {
  constructor(options: NumberOptions = {}) {
    let schema = internals.number();
    if (options.min !== undefined) {
      schema = schema.min(options.min);
    }
    if (options.max !== undefined) {
      schema = schema.max(options.max);
    }
    if (options.unsafe === true) {
      schema = schema.unsafe(true);
    }

    super(schema, options);
  }

  protected handleError(type: string, { limit, value }: Record<string, any>) {
    switch (type) {
      case 'any.required':
      case 'number.base':
        return `expected value of type [number] but got [${typeDetect(value)}]`;
      case 'number.min':
        return `Value must be equal to or greater than [${limit}].`;
      case 'number.max':
        return `Value must be equal to or lower than [${limit}].`;
    }
  }
}
