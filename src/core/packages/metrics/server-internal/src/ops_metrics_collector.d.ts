import type { Server as HapiServer } from '@hapi/hapi';
import type { Logger } from '@kbn/logging';
import type { OpsMetrics, MetricsCollector } from '@kbn/core-metrics-server';
import type { AgentStatsProvider } from '@kbn/core-elasticsearch-client-server-internal';
export interface OpsMetricsCollectorOptions {
    logger: Logger;
    cpuPath?: string;
    cpuAcctPath?: string;
}
export declare class OpsMetricsCollector implements MetricsCollector<OpsMetrics> {
    private readonly processCollector;
    private readonly osCollector;
    private readonly serverCollector;
    private readonly esClientCollector;
    constructor(server: HapiServer, agentStatsProvider: AgentStatsProvider, opsOptions: OpsMetricsCollectorOptions);
    collect(): Promise<OpsMetrics>;
    registerMetrics(): void;
    reset(): void;
}
