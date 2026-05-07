/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import typeDetect from 'type-detect';
import { z as zod } from '@kbn/zod';
import { ByteSizeValue, ensureByteSizeValue } from '../byte_size_value';
import { SchemaTypeError } from '../errors';

import { Type } from './type';

export interface ByteSizeOptions {
  validate?: (value: ByteSizeValue) => string | void;
  defaultValue?: ByteSizeValue | string | number;
  min?: ByteSizeValue | string | number;
  max?: ByteSizeValue | string | number;
}

export class ByteSizeType extends Type<ByteSizeValue> {
  constructor(options: ByteSizeOptions = {}) {
    let core = zod.preprocess(
      (value: unknown) => {
        try {
          if (value instanceof ByteSizeValue) {
            return value;
          }
          if (typeof value === 'string' || typeof value === 'number') {
            return ensureByteSizeValue(value);
          }
          return value;
        } catch (e: any) {
          throw new SchemaTypeError(e?.message ?? String(e), []);
        }
      },
      zod.custom<ByteSizeValue>((val): val is ByteSizeValue => val instanceof ByteSizeValue)
    );

    if (options.min !== undefined) {
      const limit = ensureByteSizeValue(options.min);
      core = core.refine((v) => !v.isLessThan(limit), {
        message: `Value must be equal to or greater than [${limit.toString()}]`,
      });
    }
    if (options.max !== undefined) {
      const limit = ensureByteSizeValue(options.max);
      core = core.refine((v) => !v.isGreaterThan(limit), {
        message: `Value must be equal to or less than [${limit.toString()}]`,
      });
    }

    super(core, {
      defaultValue: ensureByteSizeValue(options.defaultValue),
      validate: options.validate,
    });
  }

  protected structureTypeLabel(): string {
    return 'bytes';
  }

  protected handleError(type: string, { message, value }: Record<string, any>, path: string[]) {
    switch (type) {
      case 'any.required':
      case 'invalid_type':
        return `expected value of type [ByteSize] but got [${typeDetect(value)}]`;
      case 'custom': {
        // `z.custom()` fails with a generic "Invalid input" message; keep legacy Joi-style copy.
        if (message === 'Invalid input') {
          return `expected value of type [ByteSize] but got [${typeDetect(value)}]`;
        }
        return new SchemaTypeError(message, path);
      }
      default:
        return undefined;
    }
  }
}
