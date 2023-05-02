/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  type VersionedRouteRequestValidation,
  type VersionedSpecValidation,
  type RouteValidationFunction,
  RouteValidationError,
} from '@kbn/core-http-server';
import { z, extractErrorMessage, instanceofZodType } from '@kbn/zod';
import type { ApiVersion } from '@kbn/core-http-server';
import { RouteValidator } from '../validator';

function makeValidationFunction(schema: z.ZodTypeAny): RouteValidationFunction<unknown> {
  return (data: unknown) => {
    const result = schema.safeParse(data);
    if (!result.success) {
      return {
        error: new RouteValidationError(extractErrorMessage(result.error)),
        value: undefined,
      };
    }
    return { error: undefined, value: result.data };
  };
}

function getValidator(handler?: VersionedSpecValidation) {
  return instanceofZodType(handler) ? makeValidationFunction(handler) : handler;
}

/** Will throw if any of the validation checks fail */
export function validate(
  data: { body?: unknown; params?: unknown; query?: unknown },
  runtimeSchema: VersionedRouteRequestValidation<unknown, unknown, unknown>,
  version: ApiVersion
): { body: unknown; params: unknown; query: unknown } {
  const validator = RouteValidator.from({
    body: getValidator(runtimeSchema.body),
    params: getValidator(runtimeSchema.params),
    query: getValidator(runtimeSchema.query),
  });
  return {
    body: validator.getBody(data.body, `get ${version} body`),
    params: validator.getParams(data.params, `get ${version} params`),
    query: validator.getQuery(data.query, `get ${version} query`),
  };
}
