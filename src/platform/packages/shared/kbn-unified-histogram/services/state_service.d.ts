import type { RequestAdapter } from '@kbn/inspector-plugin/common';
import { BehaviorSubject } from 'rxjs';
import type { PublishingSubject } from '@kbn/presentation-publishing';
import { UnifiedHistogramFetchStatus } from '..';
import type { UnifiedHistogramServices, UnifiedHistogramChartLoadEvent, UnifiedHistogramTopPanelHeightContext } from '../types';
/**
 * The current state of the container
 */
export interface UnifiedHistogramState {
    /**
     * Whether or not the chart is hidden
     */
    chartHidden: boolean;
    /**
     * The current Lens request adapter
     */
    lensRequestAdapter: RequestAdapter | undefined;
    /**
     * The current Lens adapters
     */
    lensAdapters?: UnifiedHistogramChartLoadEvent['adapters'];
    /**
     * Lens embeddable output observable
     */
    dataLoading$?: PublishingSubject<boolean | undefined>;
    /**
     * The current top panel height
     */
    topPanelHeight: UnifiedHistogramTopPanelHeightContext | undefined;
    /**
     * The current fetch status of the hits count request
     */
    totalHitsStatus: UnifiedHistogramFetchStatus;
    /**
     * The current result of the hits count request
     */
    totalHitsResult: number | Error | undefined;
}
/**
 * The options used to initialize the comntainer state
 */
export interface UnifiedHistogramStateOptions {
    /**
     * The services required by the Unified Histogram components
     */
    services: UnifiedHistogramServices;
    /**
     * The prefix for the keys used in local storage -- leave undefined to avoid using local storage
     */
    localStorageKeyPrefix?: string;
    /**
     * The initial state of the container
     */
    initialState?: Partial<UnifiedHistogramState>;
}
/**
 * The service used to manage the state of the container
 */
export interface UnifiedHistogramStateService {
    /**
     * The current state of the container
     */
    state$: BehaviorSubject<UnifiedHistogramState>;
    /**
     * Sets the current chart hidden state
     */
    setChartHidden: (chartHidden: boolean) => void;
    /**
     * Sets the current top panel height
     */
    setTopPanelHeight: (topPanelHeight: UnifiedHistogramTopPanelHeightContext) => void;
    /**
     * Sets the current Lens request adapter
     */
    setLensRequestAdapter: (lensRequestAdapter: RequestAdapter | undefined) => void;
    /**
     * Sets the current Lens adapters
     */
    setLensAdapters: (lensAdapters: UnifiedHistogramChartLoadEvent['adapters'] | undefined) => void;
    setLensDataLoading$: (dataLoading$: PublishingSubject<boolean | undefined> | undefined) => void;
    /**
     * Sets the current total hits status and result
     */
    setTotalHits: (totalHits: {
        totalHitsStatus: UnifiedHistogramFetchStatus;
        totalHitsResult: number | Error | undefined;
    }) => void;
}
export declare const createStateService: (options: UnifiedHistogramStateOptions) => UnifiedHistogramStateService;
