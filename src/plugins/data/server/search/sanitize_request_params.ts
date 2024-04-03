/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ConnectionRequestParams } from '@elastic/transport';
import type { SanitizedConnectionRequestParams } from '../../common';

export function sanitizeRequestParams(
  requestParams: ConnectionRequestParams
): SanitizedConnectionRequestParams {
  return {
    method: requestParams.method,
    path: requestParams.path,
    ...(requestParams.querystring ? { querystring: requestParams.querystring } : {}),
  };
}
