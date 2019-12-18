/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { ValidationError, Type, schema, ObjectType } from '@kbn/config-schema';
import { Stream } from 'stream';
import { RouteValidationError } from './validator_error';

/**
 * Validation resolver to be used in the custom validation function
 *
 * See {@link RouteValidationFunction}.
 *
 * @public
 */
export interface RouteValidationResolver {
  ok: <T>(value: T) => { value: T };
  fail: (error: Error | string, path?: string[]) => { error: RouteValidationError };
}

/**
 * The custom validation function if @kbn/config-schema is not a valid solution for your specific plugin requirements.
 *
 * The validation should look something like:
 * ```typescript
 * interface MyExpectedBody {
 *   bar: string;
 *   baz: number;
 * }
 *
 * const myBodyValidation: RouteValidationFunction<MyExpectedBody> = (validationResolver, data) => {
 *   const { ok, fail } = validationResolver;
 *   const { bar, baz } = data || {};
 *   if (typeof bar === 'string' && typeof baz === 'number') {
 *     return ok({ bar, baz });
 *   } else {
 *     return fail('Wrong payload', ['body']);
 *   }
 * }
 * ```
 *
 * @public
 */
export type RouteValidationFunction<T> = (
  validationResolver: RouteValidationResolver,
  data: any
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
    ? ReturnType<T['validate']>
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
  public static from<P = {}, Q = {}, B = {}>(
    opts: RouteValidator<P, Q, B> | RouteValidatorFullConfig<P, Q, B>
  ) {
    if (opts instanceof RouteValidator) {
      return opts;
    }
    const { params, query, body, ...options } = opts;
    return new RouteValidator({ params, query, body }, options);
  }

  private constructor(
    private readonly config: RouteValidatorConfig<P, Q, B>,
    private readonly options: RouteValidatorOptions = {}
  ) {}

  /**
   * Get validated URL params
   * @internal
   */
  public getParams(data: unknown, namespace?: string): Readonly<P> {
    return this.validate(this.config.params, this.options.unsafe?.params, data, namespace);
  }

  /**
   * Get validated query params
   * @internal
   */
  public getQuery(data: unknown, namespace?: string): Readonly<Q> {
    return this.validate(this.config.query, this.options.unsafe?.query, data, namespace);
  }

  /**
   * Get validated body
   * @internal
   */
  public getBody(data: unknown, namespace?: string): Readonly<B> {
    return this.validate(this.config.body, this.options.unsafe?.body, data, namespace);
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
    validationRule?: RouteValidationSpec<T>,
    data?: unknown,
    namespace?: string
  ): RouteValidationResultType<typeof validationRule> {
    if (typeof validationRule === 'undefined') {
      return {};
    } else if (validationRule instanceof Type) {
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
    const routeValidationResolver: RouteValidationResolver = {
      ok: <T>(value: T) => ({ value }),
      fail: (error: Error | string, path?: string[]) => ({
        error: new RouteValidationError(error, path),
      }),
    };

    let result: ReturnType<typeof validateFn>;
    try {
      result = validateFn(routeValidationResolver, data);
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
      return schema.maybe(schema.nullable(schema.object({}, { allowUnknowns: true })));
    }
  }
}
