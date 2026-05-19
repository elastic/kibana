import React from 'react';
import type { PerformanceMetricEvent } from '../../performance_metric_events';
import type { DescriptionWithPrefix } from './types';
export type CustomMetrics = Omit<PerformanceMetricEvent, 'eventName' | 'meta' | 'duration'>;
export interface Meta {
    rangeFrom?: string;
    rangeTo?: string;
    description?: DescriptionWithPrefix;
}
export interface EventData {
    customMetrics?: CustomMetrics;
    meta?: Meta;
}
export declare function PerformanceContextProvider({ children }: {
    children: React.ReactElement;
}): React.JSX.Element;
export default PerformanceContextProvider;
