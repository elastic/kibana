/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpFetchOptions } from '@kbn/core/public';
import { buildPath } from '@kbn/core-http-browser';
import { ES_CLIENT_API_VERSION, ES_CLIENT_ROUTE_PATH } from '../common';
import type { EsClientRequestParams } from '../common/types';

/**
 * Converts proxy request params into the path and options for `http.fetch`.
 */
export const proxyArgsToEsArgs = ({
  method,
  path,
  body,
  query,
  headers,
  signal,
}: EsClientRequestParams): [string, HttpFetchOptions] => [
  buildPath(ES_CLIENT_ROUTE_PATH, { path }),
  {
    method,
    query,
    headers,
    signal,
    version: ES_CLIENT_API_VERSION,
    body: typeof body === 'object' ? JSON.stringify(body) : body,
  },
];
