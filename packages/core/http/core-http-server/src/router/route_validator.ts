/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ObjectType, SchemaTypeError, Type } from '@kbn/config-schema';

/**
 * Error to return when the validation is not successful.
 * @public
 */
export class RouteValidationError extends SchemaTypeError {
  constructor(error: Error | string, path: string[] = []) {
    super(error, path);

    // Set the prototype explicitly, see:
    // https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, RouteValidationError.prototype);
  }
}

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
export type RouteValidatorFullConfigRequest<P, Q, B> = RouteValidatorConfig<P, Q, B> &
  RouteValidatorOptions;

/**
 * Map of status codes to response schemas.
 * @public
 */
export interface RouteValidatorFullConfigResponse {
  [statusCode: number]: { body: ObjectType | Type<any> };
  unsafe?: {
    body?: boolean;
  };
}

/**
 * An alternative form to register both request schema and all response schemas.
 * @public
 */
export interface RouteValidatorRequestAndResponses<P, Q, B> {
  request: RouteValidatorFullConfigRequest<P, Q, B>;
  response?: RouteValidatorFullConfigResponse;
}

/**
 * Type container for schemas used in route related validations
 * @public
 */
export type RouteValidator<P, Q, B> =
  | RouteValidatorFullConfigRequest<P, Q, B>
  | RouteValidatorRequestAndResponses<P, Q, B>;
