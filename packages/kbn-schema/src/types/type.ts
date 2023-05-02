/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import z from 'zod';
import { ValidationError } from '../errors';

export interface TypeOptions<T> {
  defaultValue?: T | (() => T);
  validate?: (value: T) => string | void;
}

export function convertValidationToRefinement<T = unknown>(
  validate: (value: T) => string | void,
  defaultValue: unknown
): z.SuperRefinement<T> {
  return (value, ctx) => {
    if (value === defaultValue) return;

    let validationResultMessage;
    try {
      validationResultMessage = validate(value);
    } catch (e) {
      validationResultMessage = e.message || e;
    }

    if (typeof validationResultMessage === 'string') {
      ctx.addIssue({
        path: ctx.path,
        code: z.ZodIssueCode.custom,
        message: validationResultMessage,
      });
    }

    return value;
  };
}

export const symbol = Symbol('KbnConfigSchemaType');

export abstract class Type<V> {
  // This is just to enable the `TypeOf` helper, and because TypeScript would
  // fail if it wasn't initialized we use a "trick" to which basically just
  // sets the value to `null` while still keeping the type.
  public readonly type: V = null! as V;

  // used for the `isConfigSchema` typeguard
  public readonly __isKbnConfigSchemaType = symbol;

  /**
   * Internal "schema" backed by Joi.
   * @type {Schema}
   */
  protected readonly internalSchema: z.ZodType;

  protected constructor(schema: z.ZodType, options: TypeOptions<V> = {}) {
    if (options.defaultValue !== undefined) {
      schema = schema.optional().default(options.defaultValue);
    }

    if (options.validate) {
      schema = schema.superRefine(
        convertValidationToRefinement(options.validate, options.defaultValue)
      );
    }

    this.internalSchema = schema;
  }

  public validate(value: any, namespace?: string): V {
    const result = this.internalSchema.safeParse(value);

    if (!result.success) {
      throw new ValidationError(result.error, namespace);
    }

    return result.data;
  }

  /**
   * @internal
   */
  public getSchema() {
    return this.internalSchema;
  }
}
