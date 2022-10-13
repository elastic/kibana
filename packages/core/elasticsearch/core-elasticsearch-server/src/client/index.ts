/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type { ElasticsearchClient } from './client';
export type { IClusterClient, ICustomClusterClient } from './cluster_client';
export type { ScopeableRequest, FakeRequest } from './scopeable_request';
export type { IScopedClusterClient } from './scoped_cluster_client';
export type {
  UnauthorizedErrorHandler,
  UnauthorizedErrorHandlerOptions,
  UnauthorizedErrorHandlerResult,
  UnauthorizedErrorHandlerResultRetryParams,
  UnauthorizedErrorHandlerToolkit,
  UnauthorizedErrorHandlerRetryResult,
  UnauthorizedErrorHandlerNotHandledResult,
} from './unauthorized_error_handler';
export type { ElasticsearchClientConfig, ElasticsearchClientSslConfig } from './client_config';
