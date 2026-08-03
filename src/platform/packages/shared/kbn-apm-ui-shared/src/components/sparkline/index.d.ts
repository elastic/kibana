import React from 'react';
import type { SparklinePoint } from './utils';
export interface SparklineProps {
    color: string;
    series?: SparklinePoint[] | null;
    comparisonSeries?: SparklinePoint[];
    comparisonSeriesColor?: string;
    type?: 'line' | 'bar';
    compact?: boolean;
    isLoading?: boolean;
}
export declare function Sparkline({ color, series, comparisonSeries, comparisonSeriesColor, type, compact, isLoading, }: SparklineProps): React.JSX.Element;
