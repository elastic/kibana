/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SchemaTypeError, ValidationError } from '../errors';
import { AnySchema, internals, ValidationErrorItem } from '../internals';
import { Reference } from '../references';

export interface TypeOptions<T> {
  defaultValue?: T | Reference<T> | (() => T);
  validate?: (value: T) => string | void;
}

export abstract class Type<V> {
  // This is just to enable the `TypeOf` helper, and because TypeScript would
  // fail if it wasn't initialized we use a "trick" to which basically just
  // sets the value to `null` while still keeping the type.
  public readonly type: V = null! as V;

  // used for the `isConfigSchema` typeguard
  public readonly __isKbnConfigSchemaType = true;

  /**
   * Internal "schema" backed by Joi.
   * @type {Schema}
   */
  protected readonly internalSchema: AnySchema;

  protected constructor(schema: AnySchema, options: TypeOptions<V> = {}) {
    if (options.defaultValue !== undefined) {
      schema = schema.optional();

      // If default value is a function, then we must provide description for it.
      if (typeof options.defaultValue === 'function') {
        schema = schema.default(options.defaultValue, 'Type default value');
      } else {
        schema = schema.default(
          Reference.isReference(options.defaultValue)
            ? options.defaultValue.getSchema()
            : options.defaultValue
        );
      }
    }

    if (options.validate) {
      schema = schema.custom(options.validate);
    }

    // Attach generic error handler only if it hasn't been attached yet since
    // only the last error handler is counted.
    const schemaFlags = (schema.describe().flags as Record<string, any>) || {};
    if (schemaFlags.error === undefined) {
      schema = schema.error(([error]) => this.onError(error));
    }

    this.internalSchema = schema;
  }

  public validate(value: any, context: Record<string, any> = {}, namespace?: string): V {
    const { value: validatedValue, error } = internals.validate(value, this.internalSchema, {
      context,
      presence: 'required',
    });

    if (error) {
      throw new ValidationError(error as any, namespace);
    }

    return validatedValue;
  }

  /**
   * @internal
   */
  public getSchema() {
    return this.internalSchema;
  }

  protected handleError(
    type: string,
    context: Record<string, any>,
    path: string[]
  ): string | SchemaTypeError | void {
    return undefined;
  }

  private onError(error: SchemaTypeError | ValidationErrorItem): SchemaTypeError {
    if (error instanceof SchemaTypeError) {
      return error;
    }

    const { context = {}, type, path, message } = error;

    const errorHandleResult = this.handleError(type, context, path);
    if (errorHandleResult instanceof SchemaTypeError) {
      return errorHandleResult;
    }

    // If error handler just defines error message, then wrap it into proper
    // `SchemaTypeError` instance.
    if (typeof errorHandleResult === 'string') {
      return new SchemaTypeError(errorHandleResult, path);
    }

    // If error is produced by the custom validator, just extract source message
    // from context and wrap it into `SchemaTypeError` instance.
    if (type === 'any.custom') {
      return new SchemaTypeError(context.message, path);
    }

    return new SchemaTypeError(message || type, path);
  }
}
