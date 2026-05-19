import React from 'react';
import type { ParsedMetricItem } from '../../types';
interface MetricInsightsFlyoutProps {
    metricItem: ParsedMetricItem;
    esqlQuery?: string;
    onClose: () => void;
}
export declare const MetricInsightsFlyout: ({ metricItem, esqlQuery, onClose, }: MetricInsightsFlyoutProps) => React.JSX.Element;
export {};
