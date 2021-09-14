/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ValidationError, ObjectType, Type, schema, isConfigSchema } from '@kbn/config-schema';
import { Stream } from 'stream';
import { RouteValidationError } from './validator_error';

/**
 * Validation result factory to be used in the custom validation function to return the valid data or validation errors
 *
 * See {@link RouteValidationFunction}.
 *
 * @public
 */
export interface RouteValidationResultFactory {
  ok: <T>(value: T) => { value: T };
  badRequest: (error: Error | string, path?: string[]) => { error: RouteValidationError };
}

/**
 * The custom validation function if @kbn/config-schema is not a valid solution for your specific plugin requirements.
 *
 * @example
 *
 * The validation should look something like:
 * ```typescript
 * interface MyExpectedBody {
 *   bar: string;
 *   baz: number;
 * }
 *
 * const myBodyValidation: RouteValidationFunction<MyExpectedBody> = (data, validationResult) => {
 *   const { ok, badRequest } = validationResult;
 *   const { bar, baz } = data || {};
 *   if (typeof bar === 'string' && typeof baz === 'number') {
 *     return ok({ bar, baz });
 *   } else {
 *     return badRequest('Wrong payload', ['body']);
 *   }
 * }
 * ```
 *
 * @public
 */
export type RouteValidationFunction<T> = (
  data: any,
  validationResult: RouteValidationResultFactory
) =>
  | {
      value: T;
      error?: never;
    }
  | {
      value?: never;
      error: RouteValidationError;
    };

/**
 * Allowed property validation options: either @kbn/config-schema validations or custom validation functions
 *
 * See {@link RouteValidationFunction} for custom validation.
 *
 * @public
 */
export type RouteValidationSpec<T> = ObjectType | Type<T> | RouteValidationFunction<T>;

// Ugly as hell but we need this conditional typing to have proper type inference
type RouteValidationResultType<T extends RouteValidationSpec<any> | undefined> = NonNullable<
  T extends RouteValidationFunction<any>
    ? ReturnType<T>['value']
    : T extends Type<any>
    ? T['type']
    : undefined
>;

/**
 * The configuration object to the RouteValidator class.
 * Set `params`, `query` and/or `body` to specify the validation logic to follow for that property.
 *
 * @public
 */
export interface RouteValidatorConfig<P, Q, B> {
  /**
   * Validation logic for the URL params
   * @public
   */
  params?: RouteValidationSpec<P>;
  /**
   * Validation logic for the Query params
   * @public
   */
  query?: RouteValidationSpec<Q>;
  /**
   * Validation logic for the body payload
   * @public
   */
  body?: RouteValidationSpec<B>;
}

/**
 * Additional options for the RouteValidator class to modify its default behaviour.
 *
 * @public
 */
export interface RouteValidatorOptions {
  /**
   * Set the `unsafe` config to avoid running some additional internal *safe* validations on top of your custom validation
   * @public
   */
  unsafe?: {
    params?: boolean;
    query?: boolean;
    body?: boolean;
  };
}

/**
 * Route validations config and options merged into one object
 * @public
 */
export type RouteValidatorFullConfig<P, Q, B> = RouteValidatorConfig<P, Q, B> &
  RouteValidatorOptions;

/**
 * Route validator class to define the validation logic for each new route.
 *
 * @internal
 */
export class RouteValidator<P = {}, Q = {}, B = {}> {
  public static from<_P = {}, _Q = {}, _B = {}>(
    opts: RouteValidator<_P, _Q, _B> | RouteValidatorFullConfig<_P, _Q, _B>
  ) {
    if (opts instanceof RouteValidator) {
      return opts;
    }
    const { params, query, body, ...options } = opts;
    return new RouteValidator({ params, query, body }, options);
  }

  private static ResultFactory: RouteValidationResultFactory = {
    ok: <T>(value: T) => ({ value }),
    badRequest: (error: Error | string, path?: string[]) => ({
      error: new RouteValidationError(error, path),
    }),
  };

  private constructor(
    private readonly config: RouteValidatorConfig<P, Q, B>,
    private readonly options: RouteValidatorOptions = {}
  ) {}

  /**
   * Get validated URL params
   * @internal
   */
  public getParams(data: unknown, namespace?: string): Readonly<P> {
    return this.validate(this.config.params, this.options.unsafe?.params, data, namespace) as P;
  }

  /**
   * Get validated query params
   * @internal
   */
  public getQuery(data: unknown, namespace?: string): Readonly<Q> {
    return this.validate(this.config.query, this.options.unsafe?.query, data, namespace) as Q;
  }

  /**
   * Get validated body
   * @internal
   */
  public getBody(data: unknown, namespace?: string): Readonly<B> {
    return this.validate(this.config.body, this.options.unsafe?.body, data, namespace) as B;
  }

  /**
   * Has body validation
   * @internal
   */
  public hasBody(): boolean {
    return typeof this.config.body !== 'undefined';
  }

  private validate<T>(
    validationRule?: RouteValidationSpec<T>,
    unsafe?: boolean,
    data?: unknown,
    namespace?: string
  ): RouteValidationResultType<typeof validationRule> {
    if (typeof validationRule === 'undefined') {
      return {};
    }
    let precheckedData = this.preValidateSchema(data).validate(data, {}, namespace);

    if (unsafe !== true) {
      precheckedData = this.safetyPrechecks(precheckedData, namespace);
    }

    const customCheckedData = this.customValidation(validationRule, precheckedData, namespace);

    if (unsafe === true) {
      return customCheckedData;
    }

    return this.safetyPostchecks(customCheckedData, namespace);
  }

  private safetyPrechecks<T>(data: T, namespace?: string): T {
    // We can add any pre-validation safety logic in here
    return data;
  }

  private safetyPostchecks<T>(data: T, namespace?: string): T {
    // We can add any post-validation safety logic in here
    return data;
  }

  private customValidation<T>(
    validationRule: RouteValidationSpec<T>,
    data?: unknown,
    namespace?: string
  ): RouteValidationResultType<typeof validationRule> {
    if (isConfigSchema(validationRule)) {
      return validationRule.validate(data, {}, namespace);
    } else if (typeof validationRule === 'function') {
      return this.validateFunction(validationRule, data, namespace);
    } else {
      throw new ValidationError(
        new RouteValidationError(`The validation rule provided in the handler is not valid`),
        namespace
      );
    }
  }

  private validateFunction<T>(
    validateFn: RouteValidationFunction<T>,
    data: unknown,
    namespace?: string
  ): T {
    let result: ReturnType<typeof validateFn>;
    try {
      result = validateFn(data, RouteValidator.ResultFactory);
    } catch (err) {
      result = { error: new RouteValidationError(err) };
    }

    if (result.error) {
      throw new ValidationError(result.error, namespace);
    }
    return result.value;
  }

  private preValidateSchema(data: any) {
    if (Buffer.isBuffer(data)) {
      // if options.body.parse !== true
      return schema.buffer();
    } else if (data instanceof Stream) {
      // if options.body.output === 'stream'
      return schema.stream();
    } else {
      return schema.maybe(schema.nullable(schema.any({})));
    }
  }
}
