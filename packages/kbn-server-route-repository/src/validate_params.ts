/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KibanaRequest } from '@kbn/core-http-server';
import { ZodParamsObject, IoTsParamsObject } from '@kbn/server-route-repository-utils';
import { isZod } from '@kbn/zod';
import { pick } from 'lodash';
import { decodeRequestParams } from './decode_request_params';
import { formatParams } from './format_params';

export function validateParams(
  request: KibanaRequest,
  paramsSchema: ZodParamsObject | IoTsParamsObject | undefined
) {
  if (paramsSchema === undefined) {
    return undefined;
  }

  const params = formatParams(pick(request, 'params', 'body', 'query'));

  if (isZod(paramsSchema)) {
    // Already validated by platform
    return params;
  }

  return decodeRequestParams(params, paramsSchema);
}
