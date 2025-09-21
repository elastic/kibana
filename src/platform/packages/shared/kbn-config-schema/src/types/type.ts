/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CustomHelpers } from 'joi';
import {
  isSchema,
  type CustomValidator,
  type ErrorReport,
  type Schema,
  type SchemaLike,
  type WhenOptions,
} from 'joi';
import { META_FIELD_X_OAS_DEPRECATED, META_FIELD_X_OAS_DISCONTINUED } from '../oas_meta_fields';
import { SchemaTypeError, ValidationError } from '../errors';
import { Reference } from '../references';

/**
 * Generic schema type
 */
export type SomeType = Type<any, any, any>;

/**
 * Resolve the default value based on the type of D.
 *
 * We need to check if `D` is `never` to conditionally set the `_input` type.
 *
 * Additionally, Since `SomeType` sets `D` to type `any`, the type of `D` will sometimes default to `any`.
 * So if `D` is not `never` we need to check if `D` is `any`, but only when `Input` is not `any`.
 *
 * @note
 * This is only needed because we nest the `defaultValue` in the options. A purely functional transform
 * such as `schema.number().default(123)` would not need this.
 */
export type ResolveDefaultValue<D, Input> = [D] extends [never]
  ? never
  : IsAny<D> extends true
  ? IsAny<Input> extends true
    ? D
    : never
  : D;

/**
 * Meta fields used when introspecting runtime validation. Most notably for
 * generating OpenAPI spec.
 */
export interface TypeMeta {
  /**
   * A human-friendly description of this type to be used in documentation.
   */
  description?: string;
  /**
   * Whether this field is deprecated.
   */
  deprecated?: boolean;
  /**
   * Release version or date that this route will be removed
   * @example 9.0.0
   */
  'x-discontinued'?: string;
}

export type DefaultValue<T> = T | (() => T) | Reference<T>;

export interface TypeOptions<
  Output,
  Input = Output,
  D extends DefaultValue<Input> = never,
  M extends Record<string, any> = {}
> {
  /**
   * Default value of type
   */
  defaultValue?: D;
  /**
   * Supplemental validation, only called if primary validation is successful.
   *
   * @returns {string | void} a string error message if the validation failed, or `undefined` if successful.
   */
  validate?: (value: Output) => string | void;
  meta?: TypeMeta & M;
}

export interface SchemaStructureEntry {
  path: string[];
  type: string;
}

/**
 * Global validation Options to be provided when calling the `schema.validate()` method.
 */
export interface SchemaValidationOptions {
  /**
   * Remove unknown config keys
   */
  stripUnknownKeys?: boolean;
}

/**
 * Options for dealing with unknown keys:
 * - allow: unknown keys will be permitted
 * - ignore: unknown keys will not fail validation, but will be stripped out
 * - forbid (default): unknown keys will fail validation
 */
export type OptionsForUnknowns = 'allow' | 'ignore' | 'forbid';

export interface UnknownOptions {
  unknowns?: OptionsForUnknowns;
}

export interface ExtendsDeepOptions {
  unknowns?: OptionsForUnknowns;
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

export abstract class Type<Output = any, Input = Output, D extends DefaultValue<Input> = never> {
  public readonly type!: Output;
  public readonly _output!: Output;
  public readonly _input!: [D] extends [never] ? Input : Input | undefined;

  // @ts-ignore - This is needed to preserve the type of D, otherwise it will become ambiguous
  private readonly _default!: D;

  // used for the `isConfigSchema` typeguard
  public readonly __isKbnConfigSchemaType = true;

  /**
   * Internal "schema" backed by Joi.
   * @type {Schema}
   */
  protected readonly internalSchema: Schema;

  protected constructor(schema: Schema, options: TypeOptions<Output, Input, D> = {}) {
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

    if (options.meta) {
      if (options.meta.description) {
        schema = schema.description(options.meta.description);
      }
      if (options.meta.deprecated) {
        schema = schema.meta({ [META_FIELD_X_OAS_DEPRECATED]: true });
      }
      if (options.meta.deprecated && options.meta['x-discontinued'])
        schema = schema.meta({ [META_FIELD_X_OAS_DISCONTINUED]: options.meta['x-discontinued'] });
    }

    // Attach generic error handler only if it hasn't been attached yet since
    // only the last error handler is counted.
    if (schema.$_getFlag('error') === undefined) {
      schema = schema.error(([error]) => this.onError(error));
    }

    this.internalSchema = schema;
  }

  public extendsDeep(newOptions: ExtendsDeepOptions): Type<Output, Input, D> {
    return this;
  }

  /**
   * Validates the provided value against this schema.
   * If valid, the resulting output will be returned, otherwise an exception will be thrown.
   */
  public validate(
    value: unknown,
    context: Record<string, unknown> = {},
    namespace?: string,
    validationOptions?: SchemaValidationOptions
  ): Output {
    const { value: validatedValue, error } = this.internalSchema.validate(value, {
      context,
      presence: 'required',
      stripUnknown: { objects: validationOptions?.stripUnknownKeys === true },
    });

    if (error) {
      throw new ValidationError(error as any, namespace);
    }

    return validatedValue;
  }

  /**
   * @note intended for internal use, if you need to use this please contact
   *       the core team to discuss your use case.
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

function recursiveGetSchemaStructure(internalSchema: Schema, path: string[] = []) {
  const array: SchemaStructureEntry[] = [];
  // Note: we are relying on Joi internals to obtain the schema structure (recursive keys).
  // This is not ideal, but it works for now and we only need it for some integration test assertions.
  // If it breaks in the future, we'll need to update our tests.
  for (const [key, val] of (internalSchema as any)._ids._byKey.entries()) {
    array.push(...recursiveGetSchemaStructure(val.schema, [...path, key]));
  }

  if (!array.length) {
    let type: string;
    try {
      type = prettyPrintType(internalSchema, path);
    } catch (error) {
      // failed to find special type, might need to update for new joi versions or type usages
      type = internalSchema.type || 'unknown';
    }

    array.push({
      path,
      type,
    });
  }
  return array;
}

/**
 * Returns a more accurate type from complex schema definitions.
 *
 * For example, conditional values resolve to type `any` when the nested value is only ever a `string`.
 *
 * @param internalSchema
 * @param path of current schema
 * @returns schema type
 */
function prettyPrintType(schema?: SchemaLike, path: string[] = []): string {
  // takes array of possible values and de-dups and joins
  return [...new Set([prettyPrintTypeParts(schema, false, path)].flat())].filter(Boolean).join('|');
}

/**
 * Recursively collects all possible nested schema types.
 */
function prettyPrintTypeParts(
  schema?: SchemaLike,
  optional = false,
  path: string[] = []
): string | string[] {
  if (!isSchema(schema)) {
    if (schema === null) return 'null';
    // schema can be a Symbol (because of SymbolSchema). We need to wrap it with String() because
    // implicit conversion of a 'symbol' to a 'string' will fail at runtime.
    return `${String(schema ?? 'unknown')}${optional ? '?' : ''}`;
  }

  const isOptionalType = optional || schema._flags?.presence === 'optional';
  // For explicit custom schema.never
  if (schema._flags?.presence === 'forbidden') return 'never';
  // For offeringBasedSchema, schema.when, schema.conditional
  if (schema.$_terms?.whens?.length > 0)
    return (schema.$_terms.whens as WhenOptions[]).flatMap((when) =>
      [when?.then, when?.otherwise].flatMap((s) => prettyPrintTypeParts(s, isOptionalType, path))
    );
  // schema.oneOf, schema.allOf, etc.
  if (schema.$_terms?.matches?.length > 0)
    return (schema.$_terms.matches as CustomHelpers[]).flatMap((s) =>
      prettyPrintTypeParts(s.schema, isOptionalType, path)
    );
  // schema.literal
  if (schema._flags?.only && (schema as any)._valids?._values?.size > 0)
    return [...(schema as any)._valids._values.keys()].flatMap((v) =>
      prettyPrintTypeParts(v, isOptionalType, path)
    );

  return `${schema?.type || 'unknown'}${isOptionalType ? '?' : ''}`;
}
