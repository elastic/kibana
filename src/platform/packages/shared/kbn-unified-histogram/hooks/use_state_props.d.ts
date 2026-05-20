import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { UnifiedHistogramChartLoadEvent, UnifiedHistogramFetchParams, UnifiedHistogramFetchStatus, UnifiedHistogramServices, UnifiedHistogramTopPanelHeightContext } from '../types';
import type { UnifiedHistogramStateService } from '../services/state_service';
export declare const useStateProps: ({ services, localStorageKeyPrefix, stateService, fetchParams, onBreakdownFieldChange: originalOnBreakdownFieldChange, onTimeIntervalChange: originalOnTimeIntervalChange, }: {
    services: UnifiedHistogramServices;
    localStorageKeyPrefix: string | undefined;
    stateService: UnifiedHistogramStateService | undefined;
    fetchParams: UnifiedHistogramFetchParams | undefined;
    onBreakdownFieldChange: ((breakdownField: string | undefined) => void) | undefined;
    onTimeIntervalChange: ((timeInterval: string | undefined) => void) | undefined;
}) => {
    topPanelHeight: number | "max-content" | undefined;
    hits: {
        status: UnifiedHistogramFetchStatus | undefined;
        total: number | undefined;
    } | undefined;
    chart: {
        hidden: boolean | undefined;
        timeInterval: string | undefined;
    } | undefined;
    lensAdapters: Partial<import("@kbn/expressions-plugin/common").DefaultInspectorAdapters> | undefined;
    dataLoading$: import("@kbn/presentation-publishing").PublishingSubject<boolean | undefined> | undefined;
    onTopPanelHeightChange: (newTopPanelHeight: UnifiedHistogramTopPanelHeightContext) => void;
    onTimeIntervalChange: (nextTimeInterval: string | undefined) => void;
    onTotalHitsChange: (newTotalHitsStatus: UnifiedHistogramFetchStatus, newTotalHitsResult?: number | Error) => void;
    onChartHiddenChange: (newChartHidden: boolean) => void;
    onChartLoad: (event: UnifiedHistogramChartLoadEvent) => void;
    onBreakdownFieldChange: (newBreakdownField: DataViewField | undefined) => void;
};
