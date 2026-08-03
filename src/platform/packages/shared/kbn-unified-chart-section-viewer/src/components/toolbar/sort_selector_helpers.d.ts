import React from 'react';
import type { MetricsSortBy, MetricsSortDirection } from '../../types';
export declare const SORT_BY_LABELS: Record<MetricsSortBy, string>;
interface SortDirectionToggleProps {
    direction: MetricsSortDirection;
    isDisabled: boolean;
    onChange: (direction: MetricsSortDirection) => void;
}
export declare const SortDirectionToggle: ({ direction, isDisabled, onChange, }: SortDirectionToggleProps) => React.JSX.Element;
export {};
