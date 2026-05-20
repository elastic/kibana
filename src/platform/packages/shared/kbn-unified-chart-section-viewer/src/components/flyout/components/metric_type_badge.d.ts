import React from 'react';
import type { MappingTimeSeriesMetricType } from '@elastic/elasticsearch/lib/api/types';
export declare const METRIC_TYPE_DESCRIPTIONS: Partial<Record<MappingTimeSeriesMetricType, string>>;
interface MetricTypeBadgeProps {
    instrument: MappingTimeSeriesMetricType;
}
export declare const MetricTypeBadge: ({ instrument }: MetricTypeBadgeProps) => React.JSX.Element;
export {};
