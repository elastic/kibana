/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Entity categories for grouping in UI
 */
export type EntityCategory =
  | 'infrastructure'
  | 'kubernetes'
  | 'application'
  | 'cloud'
  | 'aws'
  | 'serverless'
  | 'database'
  | 'messaging';

/**
 * Entity definition based on OpenTelemetry semantic conventions and New Relic entity types
 * @see https://opentelemetry.io/docs/specs/semconv/resource/
 * @see https://opentelemetry.io/docs/specs/semconv/system/system-metrics/
 * @see https://opentelemetry.io/docs/specs/semconv/system/container-metrics/
 * @see https://opentelemetry.io/docs/specs/semconv/system/k8s-metrics/
 * @see https://opentelemetry.io/docs/specs/semconv/system/process-metrics/
 * @see https://github.com/open-telemetry/semantic-conventions/tree/main/model
 * @see https://github.com/newrelic/entity-definitions/tree/main/entity-types
 */
export interface EntityDefinition {
  /** Unique entity type identifier */
  id: string;
  /** Human-readable display name */
  displayName: string;
  /** The primary identifying attribute for this entity */
  identifyingAttribute: string;
  /** Alternative identifying attributes (fallbacks) */
  alternativeAttributes?: string[];
  /** Icon type for UI display */
  iconType: string;
  /** Category for grouping in UI */
  category: EntityCategory;
  /** Description of the entity type */
  description: string;
  /**
   * Metric prefixes for semantic metric matching based on OTel conventions
   * @see https://opentelemetry.io/docs/specs/semconv/system/system-metrics/
   */
  metricPrefixes?: string[];
}

/**
 * Data source variants for metric queries
 * - otel: OpenTelemetry metrics (uses 'utilization' suffix, 0-1 ratios)
 * - ecs: Elastic Common Schema / Elastic Agent metrics (uses 'pct' suffix)
 */
export type MetricDataSource = 'otel' | 'ecs';

/**
 * Unit types for metric formatting
 */
export type MetricUnit = 'percent' | 'bytes' | 'bytesPerSecond' | 'ms' | 's' | 'ns' | 'count';

/**
 * Metric instrument type determines aggregation strategy:
 * - gauge: Point-in-time value → AVG(field)
 * - counter: Cumulative value → SUM(RATE(field)) with time bucketing
 */
export type MetricInstrument = 'gauge' | 'counter';

/**
 * A curated ES|QL metric definition.
 *
 * Two modes:
 * 1. **Simple** - Provide `field` + `instrument`, query is auto-generated
 * 2. **Custom** - Provide `query` template for full control
 *
 * @example Simple metric (auto-generated query)
 * ```typescript
 * {
 *   id: 'memory_usage_otel',
 *   displayName: 'Memory Usage',
 *   field: 'system.memory.utilization',
 *   instrument: 'gauge',
 *   unit: 'percent',
 * }
 * ```
 *
 * @example Custom metric (explicit query template)
 * ```typescript
 * {
 *   id: 'cpu_usage_otel',
 *   displayName: 'CPU Usage',
 *   unit: 'percent',
 *   query: `
 *     TS {{index}}
 *     | STATS _idle = AVG(system.cpu.utilization) BY {{entity}}, attributes.state{{bucket}}
 *     | STATS utilization = 1 - SUM(_idle)
 *         WHERE attributes.state IN ("idle", "wait") BY {{entity}}{{timestamp}}
 *     | SORT {{sort}}
 *   `,
 * }
 * ```
 *
 * Template placeholders:
 * - `{{index}}` - Index pattern (e.g., 'metrics-*')
 * - `{{entity}}` - Entity field to group by (e.g., 'host.name')
 * - `{{bucket}}` - For trends: ', BUCKET(@timestamp, 1m)'. Empty for summary.
 * - `{{timestamp}}` - For trends: ', @timestamp'. Empty for summary.
 * - `{{sort}}` - Sort clause: '@timestamp ASC' for trends, 'column DESC' for summary.
 */
export interface CuratedMetricQuery {
  /** Unique identifier (e.g., 'cpu_usage_otel') */
  id: string;
  /** Display name (e.g., 'CPU Usage') */
  displayName: string;
  /** Description of what this metric measures */
  description?: string;
  /** Which data source this query is designed for */
  dataSource: MetricDataSource;
  /** Fields that must exist for this query to work */
  requiredFields: string[];
  /** Unit for formatting */
  unit?: MetricUnit;

  // ============================================
  // Simple mode: field + instrument
  // ============================================

  /**
   * The field to aggregate.
   * Required for simple mode, ignored if `query` is provided.
   */
  field?: string;

  /**
   * Metric instrument type - determines aggregation strategy:
   * - gauge: AVG(field)
   * - counter: SUM(RATE(field)) with time bucketing
   *
   * Required for simple mode, ignored if `query` is provided.
   */
  instrument?: MetricInstrument;

  // ============================================
  // Custom mode: explicit query template
  // ============================================

  /**
   * ES|QL query template for complex metrics.
   * When provided, `field` and `instrument` are ignored.
   *
   * Use placeholders: {{index}}, {{entity}}, {{bucket}}, {{timestamp}}, {{sort}}
   */
  query?: string;
}
