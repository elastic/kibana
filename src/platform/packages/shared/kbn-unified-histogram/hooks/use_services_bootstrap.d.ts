import { ReplaySubject } from 'rxjs';
import type { UnifiedHistogramApi, UseUnifiedHistogramProps } from './use_unified_histogram';
import type { UnifiedHistogramFetchParams, UnifiedHistogramFetch$Arguments, LensVisServiceState } from '../types';
import { LensVisService } from '../services/lens_vis_service';
export declare const useServicesBootstrap: (props: UseUnifiedHistogramProps, options?: {
    enableLensVisService?: boolean;
}) => {
    api: UnifiedHistogramApi;
    stateProps: {
        topPanelHeight: number | "max-content" | undefined;
        hits: {
            status: import("../types").UnifiedHistogramFetchStatus | undefined;
            total: number | undefined;
        } | undefined;
        chart: {
            hidden: boolean | undefined;
            timeInterval: string | undefined;
        } | undefined;
        lensAdapters: Partial<import("@kbn/expressions-plugin/common").DefaultInspectorAdapters> | undefined;
        dataLoading$: import("@kbn/presentation-publishing").PublishingSubject<boolean | undefined> | undefined;
        onTopPanelHeightChange: (newTopPanelHeight: import("../types").UnifiedHistogramTopPanelHeightContext) => void;
        onTimeIntervalChange: (nextTimeInterval: string | undefined) => void;
        onTotalHitsChange: (newTotalHitsStatus: import("../types").UnifiedHistogramFetchStatus, newTotalHitsResult?: number | Error) => void;
        onChartHiddenChange: (newChartHidden: boolean) => void;
        onChartLoad: (event: import("../types").UnifiedHistogramChartLoadEvent) => void;
        onBreakdownFieldChange: (newBreakdownField: import("@kbn/data-views-plugin/common").DataViewField | undefined) => void;
    };
    fetch$: ReplaySubject<UnifiedHistogramFetch$Arguments>;
    fetchParams: UnifiedHistogramFetchParams | undefined;
    hasValidFetchParams: boolean;
    lensVisService: LensVisService | undefined;
    lensVisServiceState: LensVisServiceState | undefined;
};
