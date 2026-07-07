/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RouteValidationFunction, RouteValidationResultFactory } from '@kbn/core-http-server';
import { stringifyZodError } from './stringify_zod_error';

interface ZodSafeParseable<Output = any> {
  safeParse(
    data: unknown
  ): { success: true; data: Output } | { success: false; error: { issues: unknown[] } };
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
 */
export function buildRouteValidationWithZod<Output>(
  schema: ZodSafeParseable<Output>
): RouteValidationFunction<Output> {
  const fn = (inputValue: unknown, validationResult: RouteValidationResultFactory) => {
    const decoded = schema.safeParse(inputValue);

    return decoded.success
      ? validationResult.ok(decoded.data)
      : validationResult.badRequest(stringifyZodError(decoded.error as any));
  };
  // Expose the original Zod schema so the OAS generator can detect and convert it.
  (fn as RouteValidationFunction<Output> & { _sourceSchema: unknown })._sourceSchema = schema;
  return fn;
}
