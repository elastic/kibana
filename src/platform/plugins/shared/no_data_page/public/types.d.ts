export interface NoDataPagePublicSetup {
    getAnalyticsNoDataPageFlavor: () => 'kibana' | 'serverless_search' | 'serverless_observability';
}
export type NoDataPagePublicStart = NoDataPagePublicSetup;
export interface NoDataPagePublicSetupDependencies {
}
export interface NoDataPagePublicStartDependencies {
}
