import type { Metric } from './metrics';
import { METRIC_TYPE } from './metrics';
declare const REPORT_VERSION = 3;
import type { UiCounterMetricType } from './metrics/ui_counter';
export interface Report {
    reportVersion: typeof REPORT_VERSION;
    uiCounter?: Record<string, {
        key: string;
        appName: string;
        eventName: string;
        type: UiCounterMetricType;
        total: number;
    }>;
    userAgent?: Record<string, {
        userAgent: string;
        key: string;
        type: METRIC_TYPE.USER_AGENT;
        appName: string;
    }>;
    application_usage?: Record<string, {
        appId: string;
        viewId: string;
        minutesOnScreen: number;
        numberOfClicks: number;
    }>;
}
export declare class ReportManager {
    static REPORT_VERSION: number;
    report: Report;
    constructor(report?: Report);
    static createReport(): Report;
    clearReport(): void;
    isReportEmpty(): boolean;
    private incrementTotal;
    assignReports(newMetrics: Metric | Metric[]): {
        report: Report;
    };
    static createMetricKey(metric: Metric): string;
    private assignReport;
}
export {};
