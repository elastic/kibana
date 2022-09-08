/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';
import { ConnectionOptions, HttpAgentOptions, UndiciAgentOptions } from '@elastic/elasticsearch';

const HTTP = 'http:';
const HTTPS = 'https:';
const DEFAULT_CONFIG: HttpAgentOptions = {
  keepAlive: true,
  keepAliveMsecs: 50000,
  maxSockets: 256,
  maxFreeSockets: 256,
  scheduling: 'lifo',
};

export type NetworkAgent = HttpAgent | HttpsAgent;
export type AgentFactory = (connectionOpts: ConnectionOptions) => NetworkAgent;

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
export class AgentManager {
  // Stores Https Agent instances
  private httpsStore: Set<HttpsAgent>;
  // Stores Http Agent instances
  private httpStore: Set<HttpAgent>;

  constructor(private baseConfig: HttpAgentOptions = DEFAULT_CONFIG) {
    this.httpsStore = new Set();
    this.httpStore = new Set();
  }

  public getAgentFactory(
    agentOptions?: HttpAgentOptions | UndiciAgentOptions | AgentFactory | false
  ): AgentFactory {
    if (isAgentFactory(agentOptions)) {
      // use the user-provided factory directly
      return agentOptions;
    }

    const agentConfig = assertValidAgentConfig(agentOptions);

    // a given agent factory (of a given type) always provides the same Agent instances (for the same protocol)
    // we keep the indexes for each protocol, so that we can access them later on, when the factory is invoked
    let httpAgent: HttpAgent;
    let httpsAgent: HttpsAgent;

    return (connectionOpts: ConnectionOptions): NetworkAgent => {
      if (isHttps(connectionOpts)) {
        if (!httpsAgent) {
          const config = Object.assign(
            {},
            DEFAULT_CONFIG,
            this.baseConfig,
            agentConfig,
            connectionOpts.tls
          );
          httpsAgent = new HttpsAgent(config);
          this.httpsStore.add(httpsAgent);
          dereferenceOnDestroy(this.httpsStore, httpsAgent);
        }

        return httpsAgent;
      }

      if (!httpAgent) {
        const config = Object.assign({}, DEFAULT_CONFIG, this.baseConfig, agentConfig);
        httpAgent = new HttpAgent(config);
        this.httpStore.add(httpAgent);
        dereferenceOnDestroy(this.httpStore, httpAgent);
      }

      return httpAgent;
    };
  }
}

const isHttps = (connectionOpts: ConnectionOptions): boolean => {
  return connectionOpts.url.protocol === HTTPS;
};

const assertValidAgentConfig = (
  agentOptions?: HttpAgentOptions | UndiciAgentOptions | false
): HttpAgentOptions => {
  if (!agentOptions) {
    return {};
  } else if (isHttpAgentOptions(agentOptions)) {
    return agentOptions;
  }

  throw new Error('Unsupported agent options: UndiciAgentOptions');
};

const isAgentFactory = (
  agentOptions?: HttpAgentOptions | UndiciAgentOptions | AgentFactory | false
): agentOptions is AgentFactory => {
  return typeof agentOptions === 'function';
};

const isHttpAgentOptions = (
  opts: HttpAgentOptions | UndiciAgentOptions
): opts is HttpAgentOptions => {
  return (
    !('keepAliveTimeout' in opts) &&
    !('keepAliveMaxTimeout' in opts) &&
    !('keepAliveTimeoutThreshold' in opts) &&
    !('pipelining' in opts) &&
    !('maxHeaderSize' in opts) &&
    !('connections' in opts)
  );
};

const dereferenceOnDestroy = (protocolStore: Set<NetworkAgent>, agent: NetworkAgent) => {
  const doDestroy = agent.destroy.bind(agent);
  agent.destroy = () => {
    protocolStore.delete(agent);
    doDestroy();
  };
};
