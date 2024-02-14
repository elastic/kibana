/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Alert } from './generated/alert_schema';
import type { ObservabilityApmAlert } from './generated/observability_apm_schema';
import type { ObservabilityLogsAlert } from './generated/observability_logs_schema';
import type { ObservabilityMetricsAlert } from './generated/observability_metrics_schema';
import type { ObservabilitySloAlert } from './generated/observability_slo_schema';
import type { ObservabilityUptimeAlert } from './generated/observability_uptime_schema';
import type { SecurityAlert } from './generated/security_schema';
import type { MlAnomalyDetectionAlert } from './generated/ml_anomaly_detection_schema';
import type { DefaultAlert } from './generated/default_schema';
import type { MlAnomalyDetectionHealthAlert } from './generated/ml_anomaly_detection_health_schema';
import type { TransformHealthAlert } from './generated/transform_health_schema';

export * from './create_schema_from_field_map';

export type { Alert } from './generated/alert_schema';
export type { ObservabilityApmAlert } from './generated/observability_apm_schema';
export type { ObservabilityLogsAlert } from './generated/observability_logs_schema';
export type { ObservabilityMetricsAlert } from './generated/observability_metrics_schema';
export type { ObservabilitySloAlert } from './generated/observability_slo_schema';
export type { ObservabilityUptimeAlert } from './generated/observability_uptime_schema';
export type { SecurityAlert } from './generated/security_schema';
export type { StackAlert } from './generated/stack_schema';
export type { MlAnomalyDetectionAlert } from './generated/ml_anomaly_detection_schema';
export type { MlAnomalyDetectionHealthAlert } from './generated/ml_anomaly_detection_health_schema';
export type { DefaultAlert } from './generated/default_schema';
export type { TransformHealthAlert } from './generated/transform_health_schema';

export type AADAlert =
  | Alert
  | ObservabilityApmAlert
  | ObservabilityLogsAlert
  | ObservabilityMetricsAlert
  | ObservabilitySloAlert
  | ObservabilityUptimeAlert
  | SecurityAlert
  | MlAnomalyDetectionAlert
  | MlAnomalyDetectionHealthAlert
  | TransformHealthAlert
  | DefaultAlert;
