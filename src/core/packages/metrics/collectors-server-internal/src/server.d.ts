import type { Server as HapiServer } from '@hapi/hapi';
import type { OpsServerMetrics, MetricsCollector } from '@kbn/core-metrics-server';
export declare class ServerMetricsCollector implements MetricsCollector<OpsServerMetrics> {
    private readonly server;
    private requests;
    private responseTimes;
    constructor(server: HapiServer);
    collect(): Promise<OpsServerMetrics>;
    reset(): void;
}
