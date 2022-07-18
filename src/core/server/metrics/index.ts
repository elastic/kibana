/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// export type {
//   MetricsServiceSetup,
//   MetricsServiceStart,
//   OpsMetrics,
//   IntervalHistogram,
// } from '@kbn/core-metrics-server';
// export type { OpsProcessMetrics, OpsServerMetrics, OpsOsMetrics } from '@kbn/core-metrics-server';
export { MetricsService } from './metrics_service';
export type { InternalMetricsServiceStart, InternalMetricsServiceSetup } from './metrics_service';
export { opsConfig } from './ops_config';
export type { OpsConfigType } from './ops_config';
// export {
//   type IEventLoopDelaysMonitor,
//   EventLoopDelaysMonitor,
// } from '@kbn/core-metrics-collectors-server-internal';
