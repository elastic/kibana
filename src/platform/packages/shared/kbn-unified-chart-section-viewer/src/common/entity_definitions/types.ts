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
