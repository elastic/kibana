/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { ResponseHeaders } from '@kbn/core-http-server';
/**
 * Return a new version of the provided headers, with all illegal http2 headers removed.
 * If `isDev` is `true`, will also log a warning if such header is encountered.
 */
export declare const stripIllegalHttp2Headers: ({
  headers,
  isDev,
  logger,
  requestContext,
}: {
  headers: ResponseHeaders;
  isDev: boolean;
  logger: Logger;
  requestContext: string;
}) => ResponseHeaders;
