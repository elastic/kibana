/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { createRepositoryClient } from './src/create_repository_client';
export { isHttpFetchError } from './src/is_http_fetch_error';

export type {
  DefaultClientOptions,
  ClientRequestParamsOf,
  RouteRepositoryClient,
} from '@kbn/server-route-repository-utils';
