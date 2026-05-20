import type { TelemetryService } from './telemetry_service';
export declare class TelemetrySender {
    private readonly telemetryService;
    private readonly refreshConfig;
    private lastReported?;
    private readonly storage;
    private sendIfDue$?;
    private retryCount;
    static getRetryDelay(retryCount: number): number;
    constructor(telemetryService: TelemetryService, refreshConfig: () => Promise<void>);
    private updateLastReported;
    /**
     * Using the local and SO's `lastReported` values, it decides whether the last report should be considered as expired
     * @returns `true` if a new report should be generated. `false` otherwise.
     */
    private isReportDue;
    /**
     * Returns `true` when the page is visible and active in the browser.
     */
    private isActiveWindow;
    /**
     * Using configuration, page visibility state and the lastReported dates,
     * it decides whether a new telemetry report should be sent.
     * @returns `true` if a new report should be sent. `false` otherwise.
     */
    private shouldSendReport;
    private sendIfDue;
    private sendUsageData;
    startChecking: () => void;
    stop: () => void;
}
