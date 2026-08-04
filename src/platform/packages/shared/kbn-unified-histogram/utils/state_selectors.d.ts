import type { UnifiedHistogramState } from '../services/state_service';
export declare const chartHiddenSelector: (state: UnifiedHistogramState) => boolean;
export declare const topPanelHeightSelector: (state: UnifiedHistogramState) => number | "max-content" | undefined;
export declare const totalHitsResultSelector: (state: UnifiedHistogramState) => number | Error | undefined;
export declare const totalHitsStatusSelector: (state: UnifiedHistogramState) => import("..").UnifiedHistogramFetchStatus;
export declare const lensAdaptersSelector: (state: UnifiedHistogramState) => Partial<import("@kbn/expressions-plugin/common").DefaultInspectorAdapters> | undefined;
export declare const lensDataLoadingSelector$: (state: UnifiedHistogramState) => import("@kbn/presentation-publishing").PublishingSubject<boolean | undefined> | undefined;
