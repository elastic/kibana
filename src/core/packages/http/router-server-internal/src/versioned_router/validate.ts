/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RouteValidatorFullConfigRequest } from '@kbn/core-http-server';
import { RouteValidator } from '../validator';

/** Will throw if any of the validation checks fail */
export function validate(
  data: { body?: unknown; params?: unknown; query?: unknown },
  runtimeSchema: RouteValidatorFullConfigRequest<unknown, unknown, unknown>
): { body: unknown; params: unknown; query: unknown } {
  const validator = RouteValidator.from(runtimeSchema);
  return {
    params: validator.getParams(data.params, 'request params'),
    query: validator.getQuery(data.query, 'request query'),
    body: validator.getBody(data.body, 'request body'),
  };
}
