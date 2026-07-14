export type { ElasticsearchClient, ElasticsearchRequestLoggingOptions } from './client';
export type { IClusterClient, ICustomClusterClient, AsScopedOptions, SpaceProjectRoutingOptions, ExpressionProjectRoutingOptions, } from './cluster_client';
export type { ScopeableRequest, FakeRequest } from './types';
export type { IScopedClusterClient } from './scoped_cluster_client';
export type { UnauthorizedErrorHandler, UnauthorizedErrorHandlerOptions, UnauthorizedErrorHandlerResult, UnauthorizedErrorHandlerResultRetryParams, UnauthorizedErrorHandlerToolkit, UnauthorizedErrorHandlerRetryResult, UnauthorizedErrorHandlerNotHandledResult, } from './unauthorized_error_handler';
export type { ElasticsearchClientConfig, ElasticsearchClientSslConfig, ElasticsearchApiToRedactInLogs, } from './client_config';
