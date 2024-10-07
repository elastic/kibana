/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Mutable } from 'utility-types';
import type { IKibanaResponse } from '@kbn/core-http-server';

/**
 * @note mutates the response object
 * @internal
 */
export function injectResponseHeaders(headers: object, response: IKibanaResponse): IKibanaResponse {
  const mutableResponse = response as Mutable<IKibanaResponse>;
  mutableResponse.options = {
    ...mutableResponse.options,
    headers: {
      ...mutableResponse.options.headers,
      ...headers,
    },
  };
  return mutableResponse;
}
