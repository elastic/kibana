import type { Reporter } from './reporter';
interface ApplicationKey {
    appId: string;
    viewId: string;
}
export declare class ApplicationUsageTracker {
    private trackedApplicationViews;
    private reporter;
    private currentAppId?;
    private currentApplicationKeys;
    private beforeUnloadListener?;
    private onVisiblityChangeListener?;
    constructor(reporter: Reporter);
    private createKey;
    static serializeKey({ appId, viewId }: ApplicationKey): string;
    private trackApplications;
    private attachListeners;
    private detachListeners;
    private sendMetricsToReporter;
    updateViewClickCounter(viewId: string): void;
    private flushTrackedViews;
    start(): void;
    stop(): void;
    setCurrentAppId(appId: string): void;
    trackApplicationViewUsage(viewId: string): void;
    pauseTrackingAll(): void;
    resumeTrackingAll(): void;
    flushTrackedView(viewId: string): void;
}
export {};
