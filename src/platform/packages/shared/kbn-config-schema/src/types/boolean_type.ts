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

import { SchemaTypeError, ValidationError } from '../errors';
import type { SchemaValidationOptions, TypeOptions } from './interfaces';
import { Type } from './type';

export class BooleanType extends Type<boolean> {
  constructor(options?: TypeOptions<boolean>) {
    const core = zod.preprocess((value: unknown) => {
      if (value === undefined) {
        return value;
      }
      if (typeof value === 'string') {
        const n = value.toLowerCase();
        if (n === 'true') {
          return true;
        }
        if (n === 'false') {
          return false;
        }
      }
      return value;
    }, zod.boolean());

    super(core, options);
  }

  /**
   * Avoid Zod preprocess + boolean losing `input` on issues (wrong messages like `[undefined]`).
   * Keeps string coercion for `'true'` / `'false'` (case-insensitive); everything else fails fast
   * with `typeDetect`.
   */
  protected validateWithFrame(
    frame: import('../validation_frame').ValidationFrame,
    value: unknown,
    context: Record<string, unknown>,
    namespace?: string,
    validationOptions?: SchemaValidationOptions
  ): boolean {
    const opts = this.typeOptions;

    if (value === undefined && opts.validate && opts.defaultValue !== undefined) {
      const { validate: _dropValidate, ...rest } = opts;
      const inner = new BooleanType(rest);
      return inner.validate(value, context, namespace, validationOptions);
    }

    if (value !== undefined) {
      if (typeof value === 'boolean') {
        return super.validateWithFrame(frame, value, context, namespace, validationOptions);
      }
      if (typeof value === 'string') {
        const n = value.toLowerCase();
        if (n === 'true' || n === 'false') {
          return super.validateWithFrame(frame, value, context, namespace, validationOptions);
        }
        throw new ValidationError(
          new SchemaTypeError(
            `expected value of type [boolean] but got [${typeDetect(value)}]`,
            []
          ),
          namespace
        );
      }
      throw new ValidationError(
        new SchemaTypeError(`expected value of type [boolean] but got [${typeDetect(value)}]`, []),
        namespace
      );
    }

    return super.validateWithFrame(frame, value, context, namespace, validationOptions);
  }

  protected structureTypeLabel(): string {
    return 'boolean';
  }

  protected handleError(type: string, { value }: Record<string, any>) {
    if (type === 'any.required' || type === 'invalid_type') {
      return `expected value of type [boolean] but got [${typeDetect(value)}]`;
    }
  }
}
