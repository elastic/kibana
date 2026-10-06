/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RouteValidatorFullConfigRequest } from '@kbn/core-http-server';
/**
 * Route validator class to define the validation logic for each new route.
 *
 * @internal
 */
export declare class RouteValidator<P = {}, Q = {}, B = {}> {
  private readonly config;
  private readonly options;
  static from<_P = {}, _Q = {}, _B = {}>(
    opts: RouteValidator<_P, _Q, _B> | RouteValidatorFullConfigRequest<_P, _Q, _B>
  ): RouteValidator<_P, _Q, _B>;
  private static ResultFactory;
  private constructor();
  /**
   * Get validated URL params
   * @internal
   */
  getParams(data: unknown, namespace?: string): Readonly<P>;
  /**
   * Get validated query params
   * @internal
   */
  getQuery(data: unknown, namespace?: string): Readonly<Q>;
  /**
   * Get validated body
   * @internal
   */
  getBody(data: unknown, namespace?: string): Readonly<B>;
  /**
   * Has body validation
   * @internal
   */
  hasBody(): boolean;
  private validate;
  private safetyPrechecks;
  private safetyPostchecks;
  private customValidation;
  private validateFunction;
  private preValidateSchema;
}
