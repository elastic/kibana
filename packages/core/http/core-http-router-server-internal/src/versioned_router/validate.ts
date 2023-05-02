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
import { ZodTypes } from '@kbn/zod';
import type { ApiVersion } from '@kbn/core-http-server';
import { instanceofZodType } from '@kbn/zod';
import { RouteValidator } from '../validator';

function prefixPath(path: Array<string | number>, message: string): string {
  return path.length ? `[${path.join('.')}]: ${message}` : message;
}

function makeValidationFunction(schema: ZodTypes.ZodTypeAny): RouteValidationFunction<unknown> {
  return (data: unknown) => {
    const result = schema.safeParse(data);
    if (!result.success) {
      const error = result.error;
      let message: string = '';
      if (error.issues.length > 1) {
        error.issues.forEach((issue) => {
          message = `${message ? message + '\n' : message} - ${prefixPath(
            issue.path,
            issue.message
          )}`;
        });
      } else {
        const [issue] = error.issues;
        message = prefixPath(issue.path, issue.message);
      }
      return {
        error: new RouteValidationError(message),
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
