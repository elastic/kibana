/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export {
  LegacyClusterClient,
  ILegacyClusterClient,
  ILegacyCustomClusterClient,
} from './cluster_client';
export { ILegacyScopedClusterClient, LegacyScopedClusterClient } from './scoped_cluster_client';
export { LegacyElasticsearchClientConfig } from './elasticsearch_client_config';
export { LegacyElasticsearchError, LegacyElasticsearchErrorHelpers } from './errors';
export * from './api_types';
