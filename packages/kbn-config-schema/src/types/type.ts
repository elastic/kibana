/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { AnySchema, CustomValidator, ErrorReport } from 'joi';
import { SchemaTypeError, ValidationError } from '../errors';
import { Reference } from '../references';

export interface TypeOptions<T> {
  defaultValue?: T | Reference<T> | (() => T);
  validate?: (value: T) => string | void;
}

export interface SchemaStructureEntry {
  path: string[];
  type: string;
}

export const convertValidationFunction = <T = unknown>(
  validate: (value: T) => string | void
): CustomValidator<T> => {
  return (value, { error }) => {
    let validationResultMessage;
    try {
      validationResultMessage = validate(value);
    } catch (e) {
      validationResultMessage = e.message || e;
    }

    if (typeof validationResultMessage === 'string') {
      return error('any.custom', { message: validationResultMessage });
    }

    return value;
  };
};

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
        schema = schema.default(options.defaultValue);
      } else {
        schema = schema.default(
          Reference.isReference(options.defaultValue)
            ? options.defaultValue.getSchema()
            : (options.defaultValue as any)
        );
      }
    }

    if (options.validate) {
      schema = schema.custom(convertValidationFunction(options.validate));
    }

    // Attach generic error handler only if it hasn't been attached yet since
    // only the last error handler is counted.
    if (schema.$_getFlag('error') === undefined) {
      schema = schema.error(([error]) => this.onError(error));
    }

    this.internalSchema = schema;
  }

  public validate(value: any, context: Record<string, any> = {}, namespace?: string): V {
    const { value: validatedValue, error } = this.internalSchema.validate(value, {
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

  public getSchemaStructure() {
    return recursiveGetSchemaStructure(this.internalSchema);
  }

  protected handleError(
    type: string,
    context: Record<string, any>,
    path: string[]
  ): string | SchemaTypeError | void {
    return undefined;
  }

  private onError(error: SchemaTypeError | ErrorReport): SchemaTypeError {
    if (error instanceof SchemaTypeError) {
      return error;
    }

    const { local, code, path, value } = error;
    const convertedPath = path.map((entry) => entry.toString());
    const context: Record<string, any> = {
      ...local,
      value,
    };

    const errorHandleResult = this.handleError(code, context, convertedPath);
    if (errorHandleResult instanceof SchemaTypeError) {
      return errorHandleResult;
    }

    // If error handler just defines error message, then wrap it into proper
    // `SchemaTypeError` instance.
    if (typeof errorHandleResult === 'string') {
      return new SchemaTypeError(errorHandleResult, convertedPath);
    }

    // If error is produced by the custom validator, just extract source message
    // from context and wrap it into `SchemaTypeError` instance.
    if (code === 'any.custom' && context.message) {
      return new SchemaTypeError(context.message, convertedPath);
    }

    // `message` is only initialized once `toString` has been called (...)
    // see https://github.com/sideway/joi/blob/master/lib/errors.js
    const message = error.toString();
    return new SchemaTypeError(message || code, convertedPath);
  }
}

function recursiveGetSchemaStructure(internalSchema: AnySchema, path: string[] = []) {
  const array: SchemaStructureEntry[] = [];
  // Note: we are relying on Joi internals to obtain the schema structure (recursive keys).
  // This is not ideal, but it works for now and we only need it for some integration test assertions.
  // If it breaks in the future, we'll need to update our tests.
  for (const [key, val] of (internalSchema as any)._ids._byKey.entries()) {
    array.push(...recursiveGetSchemaStructure(val.schema, [...path, key]));
  }
  if (!array.length) {
    array.push({ path, type: internalSchema.type ?? 'unknown' });
  }
  return array;
}
