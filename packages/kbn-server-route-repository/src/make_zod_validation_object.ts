/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ZodParamsObject } from '@kbn/server-route-repository-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';

export function makeZodValidationObject(params: ZodParamsObject) {
  return {
    params: params.shape.path ? buildRouteValidationWithZod(params.shape.path) : undefined,
    query: params.shape.query ? buildRouteValidationWithZod(params.shape.query) : undefined,
    body: params.shape.body ? buildRouteValidationWithZod(params.shape.body) : undefined,
  };
}
