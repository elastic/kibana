/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { LegacyClusterClient } from './cluster_client';
export type { ILegacyClusterClient, ILegacyCustomClusterClient } from './cluster_client';
export type {
  ILegacyScopedClusterClient,
  LegacyScopedClusterClient,
} from './scoped_cluster_client';
export type { LegacyElasticsearchClientConfig } from './elasticsearch_client_config';
export { LegacyElasticsearchErrorHelpers } from './errors';
export type { LegacyElasticsearchError } from './errors';
export * from './api_types';
