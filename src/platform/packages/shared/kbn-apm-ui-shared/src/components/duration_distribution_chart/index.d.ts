import React from 'react';
import type { BrushEndListener } from '@elastic/charts';
import { type HistogramItem, ProcessorEvent } from '@kbn/apm-types-shared';
export interface DurationDistributionChartData {
    id: string;
    histogram: HistogramItem[];
    areaSeriesColor: string;
}
interface DurationDistributionChartProps {
    data: DurationDistributionChartData[];
    hasData: boolean;
    markerCurrentEvent?: number;
    markerValue: number;
    onChartSelection?: BrushEndListener;
    selection?: [number, number];
    loading: boolean;
    hasError: boolean;
    eventType: ProcessorEvent.span | ProcessorEvent.transaction;
    dataTestSubPrefix?: string;
    showAxisTitle?: boolean;
    showLegend?: boolean;
    isOtelData?: boolean;
    'data-test-subj'?: string;
}
export declare const replaceHistogramZerosWithMinimumDomainValue: (histogramItems: HistogramItem[]) => HistogramItem[];
export declare function DurationDistributionChart({ data, hasData, markerCurrentEvent, markerValue, onChartSelection, selection, loading, hasError, eventType, 'data-test-subj': dataTestSubj, showAxisTitle, showLegend, isOtelData, }: DurationDistributionChartProps): React.JSX.Element;
export {};
