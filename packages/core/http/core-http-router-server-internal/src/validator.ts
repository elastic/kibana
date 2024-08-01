/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Stream } from 'stream';
import { isZod } from '@kbn/zod';
import { ValidationError, schema, isConfigSchema } from '@kbn/config-schema';
import type {
  RouteValidationSpec,
  RouteValidationFunction,
  RouteValidatorConfig,
  RouteValidatorFullConfigRequest,
  RouteValidationResultFactory,
  RouteValidatorOptions,
} from '@kbn/core-http-server';
import { RouteValidationError } from '@kbn/core-http-server';

/**
 * Route validator class to define the validation logic for each new route.
 *
 * @internal
 */
export class RouteValidator<P = {}, Q = {}, B = {}> {
  public static from<_P = {}, _Q = {}, _B = {}>(
    opts: RouteValidator<_P, _Q, _B> | RouteValidatorFullConfigRequest<_P, _Q, _B>
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
  ): T {
    if (typeof validationRule === 'undefined') {
      return {} as T;
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
  ): T {
    if (isConfigSchema(validationRule)) {
      return validationRule.validate(data, {}, namespace);
    } else if (isZod(validationRule)) {
      return validationRule.parse(data);
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
