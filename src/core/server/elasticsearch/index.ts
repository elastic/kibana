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
export type { NodesVersionCompatibility } from './version_check/ensure_es_version';
export type {
  ElasticsearchServiceSetup,
  ElasticsearchServiceStart,
  ElasticsearchStatusMeta,
  InternalElasticsearchServiceSetup,
  InternalElasticsearchServiceStart,
  FakeRequest,
  ScopeableRequest,
} from './types';
export * from './legacy';
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
} from './client';
