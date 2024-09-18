/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KibanaRequest } from '@kbn/core-http-server';
import { ZodParamsObject, IoTsParamsObject } from '@kbn/server-route-repository-utils';
import { isZod } from '@kbn/zod';
import { decodeRequestParams } from './decode_request_params';
import { stripNullishRequestParameters } from './strip_nullish_request_parameters';

export function validateAndDecodeParams(
  request: KibanaRequest,
  paramsSchema: ZodParamsObject | IoTsParamsObject | undefined
) {
  if (paramsSchema === undefined) {
    return undefined;
  }

  const params = stripNullishRequestParameters({
    params: request.params,
    body: request.body,
    query: request.query,
  });

  if (isZod(paramsSchema)) {
    // Already validated by platform
    return params;
  }

  return decodeRequestParams(params, paramsSchema);
}
