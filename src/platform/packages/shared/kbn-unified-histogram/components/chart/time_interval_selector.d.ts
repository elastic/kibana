import React from 'react';
import type { UnifiedHistogramChartContext } from '../../types';
export interface TimeIntervalSelectorProps {
    chart: UnifiedHistogramChartContext;
    onTimeIntervalChange: (timeInterval: string) => void;
}
export declare const TimeIntervalSelector: React.FC<TimeIntervalSelectorProps>;
