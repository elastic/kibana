/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { LazyUnifiedMetricsExperienceGrid as UnifiedMetricsExperienceGrid } from './src/components/observability/metrics/lazy_unified_metrics_experience_grid';
export { LazyTraceMetricsGrid as TraceMetricsGrid } from './src/components/observability/traces/lazy_trace_metrics_grid';
export type { UnifiedMetricsGridRestorableState } from './src/restorable_state';

// Entity definitions - types
export type { EntityDefinition, EntityCategory } from './src/common/entity_definitions';

// Entity definitions - constants and utilities
export {
  ENTITY_DEFINITIONS,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  findAvailableEntities,
  findEntityByAttribute,
  findMetricsForEntity,
  getAllEntityAttributes,
  getAllMetricPrefixes,
} from './src/common/entity_definitions';

// Curated metrics - types
export type {
  CuratedMetricQuery,
  MetricDataSource,
  MetricUnit,
  MetricInstrument,
} from './src/common/entity_definitions';

// Curated metrics - registry
export {
  CURATED_METRICS,
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
} from './src/common/entity_definitions';

// Curated metrics - utilities
export {
  detectDataSource,
  findAvailableCuratedMetrics,
  getCuratedMetricsForEntity,
  getEntitiesWithCuratedMetrics,
} from './src/common/entity_definitions';

// Query builder - types
export type { BuildQueryOptions } from './src/common/entity_definitions';

// Query builder - functions
export {
  buildQuery,
  buildSummaryQuery,
  buildTrendQuery,
  addTimeRangeFilter,
  getResultColumn,
} from './src/common/entity_definitions';
