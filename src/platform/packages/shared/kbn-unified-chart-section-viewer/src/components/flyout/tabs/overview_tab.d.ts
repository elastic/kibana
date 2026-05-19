import React from 'react';
import type { ParsedMetricItem } from '../../../types';
interface OverviewTabProps {
    metricItem: ParsedMetricItem;
    description?: string;
}
export declare const OverviewTab: ({ metricItem, description }: OverviewTabProps) => React.JSX.Element;
export {};
