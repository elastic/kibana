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
import type { $ZodRawIssue } from '@kbn/zod';

import { SchemaTypeError, ValidationError } from '../errors';
import type { SchemaValidationOptions, TypeOptions } from './interfaces';
import { Type } from './type';

const NAN_MESSAGE = 'expected value of type [number] but got [number]';

export type NumberOptions = TypeOptions<number> & {
  min?: number;
  max?: number;
  unsafe?: boolean;
};

export class NumberType extends Type<number> {
  constructor(options: NumberOptions = {}) {
    let core = zod.preprocess((value: unknown) => {
      if (value === undefined) {
        return value;
      }
      if (typeof value === 'string') {
        return Number(value);
      }
      return value;
    }, zod.number());

    if (options.min !== undefined) {
      core = core.refine((v) => v >= options.min!, {
        message: `Value must be equal to or greater than [${options.min}].`,
      });
    }
    if (options.max !== undefined) {
      core = core.refine((v) => v <= options.max!, {
        message: `Value must be equal to or lower than [${options.max}].`,
      });
    }
    if (options.unsafe !== true) {
      core = core.superRefine((val, ctx) => {
        if (!Number.isFinite(val) || Math.abs(val) > Number.MAX_SAFE_INTEGER) {
          ctx.addIssue({
            code: 'custom',
            message: `"value" must be a safe number`,
            input: val,
          } as $ZodRawIssue);
        }
      });
    }

    if (options.min !== undefined || options.max !== undefined) {
      const metaNum: Record<string, unknown> = {};
      if (options.min !== undefined) {
        metaNum.minimum = options.min;
      }
      if (options.max !== undefined) {
        metaNum.maximum = options.max;
      }
      core = core.meta(metaNum);
    }

    super(core, options);
  }

  protected validateWithFrame(
    frame: import('../validation_frame').ValidationFrame,
    value: unknown,
    context: Record<string, unknown>,
    namespace?: string,
    validationOptions?: SchemaValidationOptions
  ): number {
    const opts = this.typeOptions as NumberOptions & TypeOptions<number>;

    if (value === undefined && opts.validate && opts.defaultValue !== undefined) {
      const { validate: _dropValidate, ...rest } = opts;
      const inner = new NumberType(rest);
      return inner.validate(value, context, namespace, validationOptions);
    }

    if (typeof value === 'number' && Number.isNaN(value)) {
      throw new ValidationError(new SchemaTypeError(NAN_MESSAGE, []), namespace);
    }

    if (value !== undefined && typeof value !== 'number') {
      if (typeof value === 'string') {
        if (Number.isNaN(Number(value))) {
          throw new ValidationError(
            new SchemaTypeError(
              `expected value of type [number] but got [${typeDetect(value)}]`,
              []
            ),
            namespace
          );
        }
        return super.validateWithFrame(frame, value, context, namespace, validationOptions);
      }
      throw new ValidationError(
        new SchemaTypeError(`expected value of type [number] but got [${typeDetect(value)}]`, []),
        namespace
      );
    }

    return super.validateWithFrame(frame, value, context, namespace, validationOptions);
  }

  protected structureTypeLabel(): string {
    return 'number';
  }

  protected handleError(type: string, { limit, value }: Record<string, any>) {
    switch (type) {
      case 'any.required':
      case 'invalid_type':
        return `expected value of type [number] but got [${typeDetect(value)}]`;
      case 'too_small':
        return `Value must be equal to or greater than [${limit}].`;
      case 'too_big':
        return `Value must be equal to or lower than [${limit}].`;
    }
  }
}
