/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type {
  ElasticsearchClient,
  ShardsResponse,
  ShardsInfo,
  CountResponse,
  SearchResponse,
  GetResponse,
  DeleteDocumentResponse,
  ElasticsearchErrorDetails,
} from './types';
export { ScopedClusterClient } from './scoped_cluster_client';
export type { IScopedClusterClient } from './scoped_cluster_client';
export type { ElasticsearchClientConfig } from './client_config';
export { ClusterClient } from './cluster_client';
export type { IClusterClient, ICustomClusterClient } from './cluster_client';
export { configureClient } from './configure_client';
export { getRequestDebugMeta, getErrorMessage } from './log_query_and_deprecation';
export { retryCallCluster, migrationRetryCallCluster } from './retry_call_cluster';
export type {
  UnauthorizedErrorHandlerOptions,
  UnauthorizedErrorHandlerResultRetryParams,
  UnauthorizedErrorHandlerRetryResult,
  UnauthorizedErrorHandlerNotHandledResult,
  UnauthorizedErrorHandlerResult,
  UnauthorizedErrorHandlerToolkit,
  UnauthorizedErrorHandler,
} from './retry_unauthorized';
export type { UnauthorizedError } from './errors';
