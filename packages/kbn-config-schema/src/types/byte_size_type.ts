/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import typeDetect from 'type-detect';
import { ByteSizeValue, ensureByteSizeValue } from '../byte_size_value';
import { SchemaTypeError } from '../errors';
import { internals } from '../internals';
import { Type } from './type';

export interface ByteSizeOptions {
  // we need to special-case defaultValue as we want to handle string inputs too
  validate?: (value: ByteSizeValue) => string | void;
  defaultValue?: ByteSizeValue | string | number;
  min?: ByteSizeValue | string | number;
  max?: ByteSizeValue | string | number;
}

export class ByteSizeType extends Type<ByteSizeValue> {
  constructor(options: ByteSizeOptions = {}) {
    let schema = internals.bytes();

    if (options.min !== undefined) {
      schema = schema.min(options.min);
    }

    if (options.max !== undefined) {
      schema = schema.max(options.max);
    }

    super(schema, {
      defaultValue: ensureByteSizeValue(options.defaultValue),
      validate: options.validate,
    });
  }

  protected handleError(
    type: string,
    { limit, message, value }: Record<string, any>,
    path: string[]
  ) {
    switch (type) {
      case 'any.required':
      case 'bytes.base':
        return `expected value of type [ByteSize] but got [${typeDetect(value)}]`;
      case 'bytes.parse':
        return new SchemaTypeError(message, path);
      case 'bytes.min':
        return `Value must be equal to or greater than [${limit.toString()}]`;
      case 'bytes.max':
        return `Value must be equal to or less than [${limit.toString()}]`;
    }
  }
}
