import type { MetricsTelemetry, Metric } from '../../../../types';
/**
 * Updates the telemetry object based on a single metric row's data.
 */
export declare const accumulateMetricsRowTelemetry: (telemetry: MetricsTelemetry, metric: Metric) => void;
