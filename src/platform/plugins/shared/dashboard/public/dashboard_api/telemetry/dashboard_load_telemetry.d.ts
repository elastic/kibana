import type { DashboardApi } from '../types';
export interface PerformanceState {
    firstLoad: boolean;
    creationStartTime?: number;
    creationEndTime?: number;
    lastLoadStartTime?: number;
}
export declare function startTrackingDashboardLoadTelemetry(dashboard: DashboardApi, performanceState: PerformanceState): import("rxjs").Subscription;
