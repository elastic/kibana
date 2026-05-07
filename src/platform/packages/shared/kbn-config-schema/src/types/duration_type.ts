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
import type { Duration } from '../duration';
import { ensureDuration, isDuration } from '../duration';
import { SchemaTypeError, ValidationError } from '../errors';
import type { Reference } from '../references';

import type { SchemaValidationOptions, TypeOptions } from './interfaces';
import { Type } from './type';

export type DurationValueType = Duration | string | number;

export interface DurationOptions {
  defaultValue?: DurationValueType | Reference<DurationValueType> | (() => DurationValueType);
  validate?: (value: Duration) => string | void;
  min?: DurationValueType;
  max?: DurationValueType;
}

export class DurationType extends Type<Duration> {
  constructor(options: DurationOptions = {}) {
    let defaultValue;
    if (typeof options.defaultValue === 'function') {
      const originalDefaultValue = options.defaultValue;
      defaultValue = () => ensureDuration(originalDefaultValue());
    } else if (
      typeof options.defaultValue === 'string' ||
      typeof options.defaultValue === 'number'
    ) {
      defaultValue = ensureDuration(options.defaultValue);
    } else {
      defaultValue = options.defaultValue;
    }

    // Zod v4 `z.custom()` ignores the callback return value — coercion must happen in `preprocess`
    // (same pattern as ByteSizeType).
    let schema: zod.ZodTypeAny = zod.preprocess(
      (data: unknown) => {
        try {
          if (isDuration(data)) {
            return data;
          }
          if (typeof data === 'string' || typeof data === 'number') {
            return ensureDuration(data);
          }
          return data;
        } catch (e: any) {
          throw new SchemaTypeError(e?.message ?? String(e), []);
        }
      },
      zod.custom<Duration>((val): val is Duration => isDuration(val))
    );

    if (options.min !== undefined) {
      const limit = ensureDuration(options.min);
      schema = schema.refine(
        (v: unknown) => (v as Duration).asMilliseconds() >= limit.asMilliseconds(),
        {
          message: `Value must be equal to or greater than [${limit.toString()}]`,
        }
      );
    }
    if (options.max !== undefined) {
      const limit = ensureDuration(options.max);
      schema = schema.refine(
        (v: unknown) => (v as Duration).asMilliseconds() <= limit.asMilliseconds(),
        {
          message: `Value must be equal to or less than [${limit.toString()}]`,
        }
      );
    }

    super(schema, { validate: options.validate, defaultValue } as TypeOptions<Duration>);
  }

  /**
   * Fail fast on impossible JS types before Zod's preprocess/custom pipeline (matches legacy Joi messages).
   */
  protected validateWithFrame(
    frame: import('../validation_frame').ValidationFrame,
    value: unknown,
    context: Record<string, unknown>,
    namespace?: string,
    validationOptions?: SchemaValidationOptions
  ): Duration {
    if (
      value !== undefined &&
      !isDuration(value) &&
      typeof value !== 'string' &&
      typeof value !== 'number'
    ) {
      throw new ValidationError(
        new SchemaTypeError(
          `expected value of type [moment.Duration] but got [${typeDetect(value)}]`,
          []
        ),
        namespace
      );
    }
    return super.validateWithFrame(frame, value, context, namespace, validationOptions);
  }

  protected structureTypeLabel(): string {
    return 'duration';
  }

  protected handleError(type: string, { message, value }: Record<string, any>, path: string[]) {
    switch (type) {
      case 'any.required':
      case 'invalid_type':
        return `expected value of type [moment.Duration] but got [${typeDetect(value)}]`;
      case 'custom': {
        // `z.custom()` fails with a generic "Invalid input" message; keep legacy Joi-style copy.
        if (message === 'Invalid input') {
          return `expected value of type [moment.Duration] but got [${typeDetect(value)}]`;
        }
        return new SchemaTypeError(message, path);
      }
      default:
        return undefined;
    }
  }
}
