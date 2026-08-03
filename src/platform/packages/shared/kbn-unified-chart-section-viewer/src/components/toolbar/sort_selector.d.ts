import React from 'react';
import type { MetricsSort } from '../../types';
interface SortSelectorProps {
    sort: MetricsSort;
    onChange: (sort: MetricsSort) => void;
    fullWidth?: boolean;
}
export declare const SortSelector: ({ sort, onChange, fullWidth }: SortSelectorProps) => React.JSX.Element;
export {};
