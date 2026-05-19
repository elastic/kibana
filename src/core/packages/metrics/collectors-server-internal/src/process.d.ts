import type { OpsProcessMetrics, MetricsCollector } from '@kbn/core-metrics-server';
export declare class ProcessMetricsCollector implements MetricsCollector<OpsProcessMetrics[]> {
    static getMainThreadMetrics(processes: OpsProcessMetrics[]): undefined | OpsProcessMetrics;
    private readonly eventLoopDelayMonitor;
    private readonly eventLoopUtilizationMonitor;
    private getCurrentPidMetrics;
    collect(): OpsProcessMetrics[];
    registerMetrics(): void;
    reset(): void;
}
