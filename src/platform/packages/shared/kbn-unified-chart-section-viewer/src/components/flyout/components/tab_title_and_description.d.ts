import React from 'react';
import type { ParsedMetricItem } from '../../../types';
interface TabTitleAndDescriptionProps {
    metricItem: ParsedMetricItem;
    description?: string;
}
export declare const TabTitleAndDescription: ({ metricItem, description, }: TabTitleAndDescriptionProps) => React.JSX.Element;
export {};
