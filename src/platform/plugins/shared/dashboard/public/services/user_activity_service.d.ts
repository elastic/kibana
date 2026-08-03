import type { DashboardApi } from '../dashboard_api/types';
export declare const getDashboardUserActivityService: (api: DashboardApi) => DashboardUserActivitySession;
declare class DashboardUserActivitySession {
    private api;
    private bindedVisibilityHandler;
    private activitySubscription;
    private currentEvents;
    constructor(api: DashboardApi);
    cleanup(): void;
    private logUserActivity;
    private onVisibilityChange;
}
export {};
