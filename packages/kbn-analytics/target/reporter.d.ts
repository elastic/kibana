import { UiStatsMetric } from './metrics';
import { Storage } from './storage';
import { Report } from './report';
export interface ReporterConfig {
    http: ReportHTTP;
    storage?: Storage;
    checkInterval?: number;
    debug?: boolean;
    storageKey?: string;
}
export declare type ReportHTTP = (report: Report) => Promise<void>;
export declare class Reporter {
    checkInterval: number;
    private interval;
    private http;
    private reportManager;
    private storageManager;
    private debug;
    constructor(config: ReporterConfig);
    private saveToReport;
    private flushReport;
    start(): void;
    private log;
    reportUiStats(appName: string, type: UiStatsMetric['type'], eventNames: string | string[], count?: number): void;
    sendReports(): Promise<void>;
}
export declare function createReporter(reportedConf: ReporterConfig): Reporter;
//# sourceMappingURL=reporter.d.ts.map