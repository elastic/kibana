/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type {
  ElasticsearchClient,
  IScopedClusterClient,
  IClusterClient,
  ICustomClusterClient,
  ScopeableRequest,
  UnauthorizedErrorHandlerResult,
  UnauthorizedErrorHandler,
  UnauthorizedErrorHandlerRetryResult,
  UnauthorizedErrorHandlerToolkit,
  UnauthorizedErrorHandlerResultRetryParams,
  UnauthorizedErrorHandlerNotHandledResult,
  UnauthorizedErrorHandlerOptions,
  FakeRequest,
  ElasticsearchClientSslConfig,
  ElasticsearchClientConfig,
} from './client';

export type {
  ElasticsearchConfigPreboot,
  ElasticsearchServicePreboot,
  ElasticsearchServiceStart,
  ElasticsearchServiceSetup,
} from './contracts';
export type { IElasticsearchConfig, ElasticsearchSslConfig } from './elasticsearch_config';
export type { ElasticsearchRequestHandlerContext } from './request_handler_context';
