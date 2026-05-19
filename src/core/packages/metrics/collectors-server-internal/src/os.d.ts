import type { Logger } from '@kbn/logging';
import type { MetricsCollector, OpsOsMetrics } from '@kbn/core-metrics-server';
export interface OsMetricsCollectorOptions {
    logger: Logger;
    cpuPath?: string;
    cpuAcctPath?: string;
}
export declare class OsMetricsCollector implements MetricsCollector<OpsOsMetrics> {
    private readonly cgroupCollector;
    private readonly log;
    constructor(options: OsMetricsCollectorOptions);
    collect(): Promise<OpsOsMetrics>;
    reset(): void;
    registerMetrics(): void;
    private getDistroStats;
}
