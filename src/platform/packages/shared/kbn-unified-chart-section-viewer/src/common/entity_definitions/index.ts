/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Entity types and definitions
export type { EntityDefinition, EntityCategory } from './types';
export { ENTITY_DEFINITIONS, CATEGORY_ORDER, CATEGORY_LABELS } from './definitions';

// Curated metric types
export type { CuratedMetricQuery, MetricDataSource, MetricUnit, MetricInstrument } from './types';

// Curated metrics registry
export { CURATED_METRICS } from './metrics';
export {
  HOST_METRICS,
  CONTAINER_METRICS,
  PROCESS_METRICS,
  K8S_POD_METRICS,
  K8S_NODE_METRICS,
  K8S_CONTAINER_METRICS,
  K8S_DEPLOYMENT_METRICS,
  K8S_NAMESPACE_METRICS,
  EC2_METRICS,
  RDS_METRICS,
  S3_METRICS,
  SQS_METRICS,
  LAMBDA_METRICS,
} from './metrics';

// Entity utilities
export {
  findAvailableEntities,
  findEntityByAttribute,
  findMetricsForEntity,
  getAllEntityAttributes,
  getAllMetricPrefixes,
} from './utils';

// Curated metrics utilities
export {
  detectDataSource,
  findAvailableCuratedMetrics,
  getCuratedMetricsForEntity,
  getEntitiesWithCuratedMetrics,
} from './utils';

// Query builder
export type { BuildQueryOptions } from './query_builder';
export {
  buildQuery,
  buildSummaryQuery,
  buildTrendQuery,
  addTimeRangeFilter,
  getResultColumn,
} from './query_builder';
