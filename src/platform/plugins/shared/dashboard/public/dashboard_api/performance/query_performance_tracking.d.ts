import type { PresentationContainer } from '@kbn/presentation-publishing';
export interface PerformanceState {
    firstLoad: boolean;
    creationStartTime?: number;
    creationEndTime?: number;
    lastLoadStartTime?: number;
}
export declare function startQueryPerformanceTracking(dashboard: PresentationContainer, performanceState: PerformanceState): import("rxjs").Subscription;
