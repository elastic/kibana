/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IKibanaResponse } from '@kbn/core-http-server';
import { KibanaResponse } from '../response';

/**
 * We "copy" to inject our headers without mutating the original response.
 * @internal
 */
export function injectResponseHeaders(headers: object, response: IKibanaResponse): IKibanaResponse {
  return new KibanaResponse(response.status, response.payload, {
    ...response.options,
    headers: {
      ...response.options?.headers,
      ...headers,
    },
  });
}
