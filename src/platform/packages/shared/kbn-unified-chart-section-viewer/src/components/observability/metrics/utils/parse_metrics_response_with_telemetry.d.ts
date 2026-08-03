import type { MetricsESQLResponse, MetricsTelemetry, ParsedMetricsWithTelemetry } from '../../../../types';
export declare const createInitialMetricsTelemetry: () => MetricsTelemetry;
export declare const parseMetricsWithTelemetry: (response: MetricsESQLResponse[], getFieldType?: (name: string) => string | undefined) => ParsedMetricsWithTelemetry;
