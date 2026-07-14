import type { ElasticsearchClientsMetrics } from '@kbn/core-metrics-server';
import type { NetworkAgent } from './agent_manager';
export declare const getAgentsSocketsStats: (agents: Set<NetworkAgent>) => ElasticsearchClientsMetrics;
