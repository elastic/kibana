import type { AnalyticsServiceStart } from '@kbn/core/public';
import React, { type ReactNode } from 'react';
import { type UnifiedChartSectionViewerTelemetry } from '../analytics/report_unified_chart_section_viewer_data_summary';
export interface EventBasedTelemetryProviderProps {
    analytics?: AnalyticsServiceStart;
    children: ReactNode;
}
export declare const EventBasedTelemetryProvider: ({ analytics, children, }: EventBasedTelemetryProviderProps) => React.JSX.Element;
export declare const useTelemetry: () => UnifiedChartSectionViewerTelemetry;
