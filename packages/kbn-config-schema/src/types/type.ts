/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { AnySchema, CustomValidator, ErrorReport } from 'joi';
import { META_FIELD_X_OAS_DEPRECATED } from '../oas_meta_fields';
import { SchemaTypeError, ValidationError } from '../errors';
import { Reference } from '../references';

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
}

export interface TypeOptions<T> {
  defaultValue?: T | Reference<T> | (() => T);
  validate?: (value: T) => string | void;
  meta?: TypeMeta;
}

export interface SchemaStructureEntry {
  path: string[];
  type: string;
}

/**
 * A special type that represents all types that have been transformed. We lose
 * any type specific options or arguments by doing this so it is important
 * to do any transformations last. Right now there is no simple way to provide
 * an abstract "transform" method AND preserve extended types info as this
 * would require TS to support some kind of higher kinded type e.g.:
 *
 * transform<R>(this: this<V, *>, fn: (v: T) => R): this<T, R>;
 *
 * So the trade-off was made to provide relatively good ergonomics and keep
 * implementation simple while losing some type information. This is similar to
 * how Zod, another popular validation lib approaches `.transform`.
 */
export type TransformedType<T, R> = Type<T, R>;

/**
 * Options for dealing with unknown keys:
 * - allow: unknown keys will be permitted
 * - ignore: unknown keys will not fail validation, but will be stripped out
 * - forbid (default): unknown keys will fail validation
 */
export type OptionsForUnknowns = 'allow' | 'ignore' | 'forbid';

export type TypeOrLazyType = Type<any> | (() => Type<any>);

export type TypeOf<RT extends TypeOrLazyType> = RT extends () => Type<any>
  ? ReturnType<RT>['type']
  : RT extends Type<any>
  ? RT['type']
  : never;

export type TypeOfOutput<RT extends TypeOrLazyType> = RT extends () => Type<any>
  ? ReturnType<RT>['transformedType']
  : RT extends Type<any>
  ? RT['transformedType']
  : never;

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

export abstract class Type<V, R = V> {
  // This is just to enable the `TypeOf` helper, and because TypeScript would
  // fail if it wasn't initialized we use a "trick" to which basically just
  // sets the value to `null` while still keeping the type.
  public readonly type: V = null! as V;
  public transformedType: R = null! as R;

  // used for the `isConfigSchema` typeguard
  public readonly __isKbnConfigSchemaType = true;

  private transformFn?: (v: any) => any;

  /**
   * Internal "schema" backed by Joi.
   * @type {Schema}
   */
  protected internalSchema: AnySchema;

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

    if (options.meta) {
      if (options.meta.description) {
        schema = schema.description(options.meta.description);
      }
      if (options.meta.deprecated) {
        schema = schema.meta({ [META_FIELD_X_OAS_DEPRECATED]: true });
      }
    }

    // Attach generic error handler only if it hasn't been attached yet since
    // only the last error handler is counted.
    if (schema.$_getFlag('error') === undefined) {
      schema = schema.error(([error]) => this.onError(error));
    }

    this.internalSchema = schema;
  }

  public extendsDeep(newOptions: ExtendsDeepOptions): Type<V, R> {
    return this;
  }

  public validate(value: any, context: Record<string, any> = {}, namespace?: string): R {
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

  public transform<R>(fn: (v: V) => R) {
    if (!this.transformFn) {
      this.internalSchema = this.internalSchema.custom((v) => this.transformFn!(v));
    }
    this.transformFn = fn.bind(null);
    // hacky way of injecting transformed type schema
    return this as unknown as TransformedType<V, R>;
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
