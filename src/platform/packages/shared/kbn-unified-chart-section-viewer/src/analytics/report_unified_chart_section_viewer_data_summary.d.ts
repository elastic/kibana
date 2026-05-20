import type { AnalyticsServiceStart } from '@kbn/core/public';
import type { MetricsTelemetry } from '../types';
export interface UnifiedChartSectionViewerTelemetry {
    trackMetricsInfo: (telemetryPayload: MetricsTelemetry) => void;
}
export declare const createUnifiedChartSectionViewerTelemetry: (analytics?: AnalyticsServiceStart) => UnifiedChartSectionViewerTelemetry;
