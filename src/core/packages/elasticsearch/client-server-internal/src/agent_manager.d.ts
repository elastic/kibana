import { Agent as HttpAgent, type AgentOptions } from 'http';
import { Agent as HttpsAgent } from 'https';
import type { ConnectionOptions, HttpAgentOptions } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClientsMetrics } from '@kbn/core-metrics-server';
export type NetworkAgent = HttpAgent | HttpsAgent;
export type AgentFactory = (connectionOpts: ConnectionOptions) => NetworkAgent;
export interface AgentFactoryProvider {
    getAgentFactory(agentOptions?: HttpAgentOptions): AgentFactory;
}
export interface AgentManagerOptions {
    /**
     * The maximum number of seconds to retain the DNS lookup resolutions.
     * Set to 0 to disable the cache (default Node.js behavior)
     */
    dnsCacheTtlInSeconds: number;
}
/**
 * Exposes the APIs to fetch stats of the existing agents.
 */
export interface AgentStatsProvider {
    /**
     * Returns the {@link ElasticsearchClientsMetrics}, to understand the load on the Elasticsearch HTTP agents.
     */
    getAgentsStats(): ElasticsearchClientsMetrics;
}
/**
 * Allows obtaining Agent factories, which can then be fed into elasticsearch-js's Client class.
 * Ideally, we should obtain one Agent factory for each ES Client class.
 * This allows using the same Agent across all the Pools and Connections of the Client (one per ES node).
 *
 * Agent instances are stored internally to allow collecting metrics (nbr of active/idle connections to ES).
 *
 * Using the same Agent factory across multiple ES Client instances is strongly discouraged, cause ES Client
 * exposes methods that can modify the underlying pools, effectively impacting the connections of other Clients.
 * @internal
 **/
export declare class AgentManager implements AgentFactoryProvider, AgentStatsProvider {
    private readonly logger;
    private readonly agents;
    private readonly cacheableLookup?;
    constructor(logger: Logger, options: AgentManagerOptions);
    getAgentFactory(agentOptions?: AgentOptions): AgentFactory;
    getAgentsStats(): ElasticsearchClientsMetrics;
    private registerMetrics;
}
