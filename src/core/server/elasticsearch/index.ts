/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export { ElasticsearchService } from './elasticsearch_service';
export { config, configSchema, ElasticsearchConfig } from './elasticsearch_config';
export { NodesVersionCompatibility } from './version_check/ensure_es_version';
export {
  ElasticsearchServiceSetup,
  ElasticsearchServiceStart,
  ElasticsearchStatusMeta,
  InternalElasticsearchServiceSetup,
  InternalElasticsearchServiceStart,
  FakeRequest,
  ScopeableRequest,
} from './types';
export * from './legacy';
export {
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
  Explanation,
  GetResponse,
  DeleteDocumentResponse,
} from './client';
