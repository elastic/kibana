/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';
import type { ConnectionOptions, HttpAgentOptions } from '@elastic/elasticsearch';

const HTTPS = 'https:';
const DEFAULT_CONFIG: HttpAgentOptions = {
  keepAlive: true,
  keepAliveMsecs: 1000,
  maxSockets: 256,
  maxFreeSockets: 256,
  scheduling: 'lifo',
};

export type NetworkAgent = HttpAgent | HttpsAgent;
export type AgentFactory = (connectionOpts: ConnectionOptions) => NetworkAgent;

export interface AgentFactoryProvider {
  getAgentFactory(agentOptions?: HttpAgentOptions): AgentFactory;
}

export interface AgentStore {
  getAgents(): Set<NetworkAgent>;
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
export class AgentManager implements AgentFactoryProvider, AgentStore {
  private agents: Set<HttpAgent>;

  constructor(private agentOptions: HttpAgentOptions = DEFAULT_CONFIG) {
    this.agents = new Set();
  }

  public getAgentFactory(agentOptions?: HttpAgentOptions): AgentFactory {
    // a given agent factory always provides the same Agent instances (for the same protocol)
    // we keep references to the instances at factory level, to be able to reuse them
    let httpAgent: HttpAgent;
    let httpsAgent: HttpsAgent;

    return (connectionOpts: ConnectionOptions): NetworkAgent => {
      if (connectionOpts.url.protocol === HTTPS) {
        if (!httpsAgent) {
          const config = Object.assign(
            {},
            DEFAULT_CONFIG,
            this.agentOptions,
            agentOptions,
            connectionOpts.tls
          );
          httpsAgent = new HttpsAgent(config);
          this.agents.add(httpsAgent);
          dereferenceOnDestroy(this.agents, httpsAgent);
        }

        return httpsAgent;
      }

      if (!httpAgent) {
        const config = Object.assign({}, DEFAULT_CONFIG, this.agentOptions, agentOptions);
        httpAgent = new HttpAgent(config);
        this.agents.add(httpAgent);
        dereferenceOnDestroy(this.agents, httpAgent);
      }

      return httpAgent;
    };
  }

  public getAgents(): Set<NetworkAgent> {
    return this.agents;
  }
}

const dereferenceOnDestroy = (store: Set<NetworkAgent>, agent: NetworkAgent) => {
  const doDestroy = agent.destroy.bind(agent);
  agent.destroy = () => {
    store.delete(agent);
    doDestroy();
  };
};
