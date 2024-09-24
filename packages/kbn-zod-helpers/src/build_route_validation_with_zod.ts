/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf, ZodType } from '@kbn/zod';
import type { RouteValidationFunction, RouteValidationResultFactory } from '@kbn/core/server';
import { stringifyZodError } from './stringify_zod_error';

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
