/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TypeOf, ZodType, stringifyZodError } from '@kbn/zod';
import {
  RouteValidationFunction,
  RouteValidationResultFactory,
  RouteValidator,
  RouteValidatorFullConfigRequest,
  RouteValidatorFullConfigResponse,
  RouteValidatorRequestAndResponses,
} from './route_validator';

type AnyRouteValidator = RouteValidator<unknown, unknown, unknown>;

/**
 * {@link RouteValidator} is a union type of all possible ways that validation
 * configuration can be registered. This helper utility narrows down the type
 * by indicating whether it is {@link RouteValidatorRequestAndResponses} or not.
 * @public
 */
export function isFullValidatorContainer(
  value: AnyRouteValidator
): value is RouteValidatorRequestAndResponses<unknown, unknown, unknown> {
  return 'request' in value;
}

/**
 * Extracts {@link RouteValidatorFullConfigRequest} from the validation container.
 * This utility is intended to be used by code introspecting router validation configuration.
 * @public
 */
export function getRequestValidation<P, Q, B>(
  value: RouteValidator<P, Q, B> | (() => RouteValidator<P, Q, B>)
): RouteValidatorFullConfigRequest<P, Q, B> {
  if (typeof value === 'function') value = value();
  return isFullValidatorContainer(value) ? value.request : value;
}

/**
 * Extracts {@link RouteValidatorFullConfigRequest} from the validation container.
 * This utility is intended to be used by code introspecting router validation configuration.
 * @public
 */
export function getResponseValidation(
  value:
    | RouteValidator<unknown, unknown, unknown>
    | (() => RouteValidator<unknown, unknown, unknown>)
): undefined | RouteValidatorFullConfigResponse {
  if (typeof value === 'function') value = value();
  return isFullValidatorContainer(value) ? value.response : undefined;
}

/**
 * Zod validation factory for Kibana route's request validation.
 * It allows to pass a Zod schema for parameters, query and/or body validation.
 *
 * Example:
 *
 * ```ts
 * router.versioned
 *   .post({
 *     access: 'public',
 *     path: MY_URL,
 *   })
 *   .addVersion(
 *     {
 *       version: 'my-version',
 *       validate: {
 *         request: {
 *           params: buildRouteValidationWithZod(MyRequestParamsZodSchema),
 *           query: buildRouteValidationWithZod(MyRequestQueryZodSchema),
 *           body: buildRouteValidationWithZod(MyRequestBodyZodSchema),
 *         },
 *       },
 *     },
 * ```
 * @public
 */
export function buildRouteValidationWithZod<ZodSchema extends ZodType, Type = TypeOf<ZodSchema>>(
  schema: ZodSchema
): RouteValidationFunction<Type> {
  return (inputValue: unknown, validationResult: RouteValidationResultFactory) => {
    const decoded = schema.safeParse(inputValue);

    return decoded.success
      ? validationResult.ok(decoded.data)
      : validationResult.badRequest(stringifyZodError(decoded.error));
  };
}
