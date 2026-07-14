import type { ElasticsearchClientsMetrics, MetricsCollector } from '@kbn/core-metrics-server';
import type { AgentStatsProvider } from '@kbn/core-elasticsearch-client-server-internal';
export declare class ElasticsearchClientsMetricsCollector implements MetricsCollector<ElasticsearchClientsMetrics> {
    private readonly agentStatsProvider;
    constructor(agentStatsProvider: AgentStatsProvider);
    collect(): Promise<ElasticsearchClientsMetrics>;
    reset(): void;
}
