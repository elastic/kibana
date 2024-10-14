/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Agent as HttpAgent, type AgentOptions } from 'http';
import { Agent as HttpsAgent } from 'https';
import CacheableLookup from 'cacheable-lookup';
import type { ConnectionOptions, HttpAgentOptions } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClientsMetrics } from '@kbn/core-metrics-server';
import { getAgentsSocketsStats } from './get_agents_sockets_stats';

const HTTPS = 'https:';

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
export class AgentManager implements AgentFactoryProvider, AgentStatsProvider {
  private readonly agents: Set<HttpAgent>;
  private readonly cacheableLookup?: CacheableLookup;

  constructor(private readonly logger: Logger, options: AgentManagerOptions) {
    this.agents = new Set();
    // Use DNS caching to avoid too many repetitive (and CPU-blocking) dns.lookup calls
    if (options.dnsCacheTtlInSeconds > 0) {
      this.logger.info(
        `Caching ES host DNS resolutions for up to ${options.dnsCacheTtlInSeconds}s. If this causes problems, change the setting "elasticsearch.dnsCacheTtl: ${options.dnsCacheTtlInSeconds}s".`
      );
      this.cacheableLookup = new CacheableLookup({
        maxTtl: options.dnsCacheTtlInSeconds,
      });
    }
  }

  public getAgentFactory(agentOptions?: AgentOptions): AgentFactory {
    // a given agent factory always provides the same Agent instances (for the same protocol)
    // we keep references to the instances at factory level, to be able to reuse them
    let httpAgent: HttpAgent;
    let httpsAgent: HttpsAgent;

    return (connectionOpts: ConnectionOptions): NetworkAgent => {
      if (connectionOpts.url.protocol === HTTPS) {
        if (!httpsAgent) {
          const config = Object.assign({}, agentOptions, connectionOpts.tls);
          httpsAgent = new HttpsAgent(config);
          this.agents.add(httpsAgent);
          dereferenceOnDestroy(this.agents, httpsAgent);
          this.cacheableLookup?.install(httpsAgent);
        }

        return httpsAgent;
      }

      if (!httpAgent) {
        httpAgent = new HttpAgent(agentOptions);
        this.agents.add(httpAgent);
        dereferenceOnDestroy(this.agents, httpAgent);
        this.cacheableLookup?.install(httpAgent);
      }

      return httpAgent;
    };
  }

  public getAgentsStats(): ElasticsearchClientsMetrics {
    const stats = getAgentsSocketsStats(this.agents);

    if (stats.totalQueuedRequests > 0) {
      this.logger.warn(
        `There are ${stats.totalQueuedRequests} queued requests. If this number is constantly high, consider scaling Kibana horizontally or increasing "elasticsearch.maxSockets" in the config.`
      );
    }

    return stats;
  }
}

const dereferenceOnDestroy = (store: Set<NetworkAgent>, agent: NetworkAgent) => {
  const doDestroy = agent.destroy.bind(agent);
  agent.destroy = () => {
    store.delete(agent);
    doDestroy();
  };
};
