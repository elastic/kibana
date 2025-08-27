/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod';
import { DeepStrict } from '@kbn/zod-helpers';
import type { ZodParamsObject } from '@kbn/server-route-repository-utils';
import { getNoParamsValidationObjectForRouteMethod } from './validation_objects';

export function makeZodValidationObject(
  params: ZodParamsObject,
  method: ReturnType<typeof parseEndpoint>['method']
) {
  const noParams = getNoParamsValidationObjectForRouteMethod(method);

  return {
    params: params.shape.path ? asStrict(params.shape.path) : noParams.params,
    query: params.shape.query ? asStrict(params.shape.query) : noParams.query,
    body: params.shape.body ? asStrict(params.shape.body) : noParams.body,
  };
}

export function makeZodResponsesValidationObject<T extends object, TReturnType = any>(
  responseSchema: T
): RouteValidatorFullConfigResponse {
  const { ...statusCodes } = responseSchema;
  const response: RouteValidatorFullConfigResponse = {};

  for (const [statusCode, validation] of Object.entries(statusCodes)) {
    response[parseInt(statusCode, 10)] = {
      ...validation,
      body: validation.body ? () => validation.body : validation.body,
      bodyV4: validation?.body ?? z4.object({}),
    };
  }

  return response;
}

function asStrict(schema: z.Schema) {
  return DeepStrict(schema);
}
