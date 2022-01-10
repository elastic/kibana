/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { ElasticsearchService } from './elasticsearch_service';
export { config, configSchema } from './elasticsearch_config';
export { ElasticsearchConfig } from './elasticsearch_config';
export type {
  NodesVersionCompatibility,
  PollEsNodesVersionOptions,
} from './version_check/ensure_es_version';
export type {
  ElasticsearchServicePreboot,
  ElasticsearchServiceSetup,
  ElasticsearchServiceStart,
  ElasticsearchStatusMeta,
  InternalElasticsearchServicePreboot,
  InternalElasticsearchServiceSetup,
  InternalElasticsearchServiceStart,
  FakeRequest,
  ScopeableRequest,
  ElasticsearchConfigPreboot,
} from './types';
export type {
  IClusterClient,
  ICustomClusterClient,
  ElasticsearchClientConfig,
  ElasticsearchClient,
  IScopedClusterClient,
  // responses
  SearchResponse,
  CountResponse,
  ShardsInfo,
  ShardsResponse,
  GetResponse,
  DeleteDocumentResponse,
  ElasticsearchErrorDetails,
  // unauthorized error handler
  UnauthorizedErrorHandlerOptions,
  UnauthorizedErrorHandlerResultRetryParams,
  UnauthorizedErrorHandlerRetryResult,
  UnauthorizedErrorHandlerNotHandledResult,
  UnauthorizedErrorHandlerResult,
  UnauthorizedErrorHandlerToolkit,
  UnauthorizedErrorHandler,
  UnauthorizedError,
} from './client';
export { getRequestDebugMeta, getErrorMessage } from './client';
export { pollEsNodesVersion } from './version_check/ensure_es_version';
export {
  isSupportedEsServer,
  isNotFoundFromUnsupportedServer,
  PRODUCT_RESPONSE_HEADER,
} from './supported_server_response_check';
