/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { resources } from '@elastic/opentelemetry-node/sdk';
import type { MetricsConfig, MonitoringCollectionConfig } from '@kbn/metrics-config';
/**
 * Options to the initMetrics method
 */
export interface InitMetricsOptions {
  /**
   * The OpenTelemetry resource information
   */
  resource: resources.Resource;
  /**
   * The OpenTelemetry metrics configuration
   */
  metricsConfig: MetricsConfig;
  /**
   * The config of the Monitoring Collection plugin
   */
  monitoringCollectionConfig: MonitoringCollectionConfig;
}
/**
 * Initialize the OpenTelemetry meter provider
 * @param initMetricsOptions {@link InitMetricsOptions}
 */
export declare function initMetrics(initMetricsOptions: InitMetricsOptions): void;
