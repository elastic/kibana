import { Metric, UiStatsMetricReport } from './metrics';
export interface Report {
    uiStatsMetrics: {
        [key: string]: UiStatsMetricReport;
    };
}
export declare class ReportManager {
    report: Report;
    constructor(report?: Report);
    static createReport(): {
        uiStatsMetrics: {};
    };
    clearReport(): void;
    isReportEmpty(): boolean;
    private incrementStats;
    assignReports(newMetrics: Metric[]): void;
    static createMetricKey(metric: Metric): string;
    private assignReport;
}
//# sourceMappingURL=report.d.ts.map