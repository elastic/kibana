import type { Logger } from '@kbn/logging';
import type { MetricsCollector } from '@kbn/core-metrics-server';
import type { OsCgroupMetrics } from './types';
interface OsCgroupMetricsCollectorOptions {
    logger: Logger;
    cpuPath?: string;
    cpuAcctPath?: string;
}
export declare class OsCgroupMetricsCollector implements MetricsCollector<OsCgroupMetrics> {
    private readonly options;
    /**  Used to prevent unnecessary file reads on systems not using cgroups. */
    private noCgroupPresent;
    /** Are resources being managed by cgroup2? */
    private isCgroup2;
    private cpuPath?;
    private cpuAcctPath?;
    constructor(options: OsCgroupMetricsCollectorOptions);
    collect(): Promise<OsCgroupMetrics>;
    reset(): void;
    private hasPaths;
    private initializePaths;
}
export {};
