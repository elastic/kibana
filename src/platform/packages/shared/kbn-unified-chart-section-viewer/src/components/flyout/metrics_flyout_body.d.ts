import React from 'react';
import type { ParsedMetricItem } from '../../types';
interface MetricFlyoutBodyProps {
    metricItem: ParsedMetricItem;
    description?: string;
    esqlQuery?: string;
}
export declare const MetricFlyoutBody: ({ metricItem, esqlQuery, description }: MetricFlyoutBodyProps) => React.JSX.Element;
export {};
