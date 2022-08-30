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
import { Logger } from '@kbn/logging';

export type NetworkAgent = HttpAgent | HttpsAgent;
export type AgentFactory = (connectionOpts: ConnectionOptions) => NetworkAgent;

/** @internal **/
export class AgentManager {
  /**
   * Store Agent instances by protocol => type => ES client creation date, e.g.:
   * {
   *   'https:': {
   *     data: (1661863534353 => dataAgentInstance1, 1661863564280 => dataAgentInstance2)
   *     monitoring: (1661863651758 => monitoringAgentInstance1)
   *   }
   * }
   *
   * Note that:
   * - a new ES Client will be creating a new Cluster.
   * - a Cluster will be creating a new ConnectionPool.
   * - a ConnectionPool creates a bunch of HttpConnections (one per ES node).
   * Even if we could reuse the Agent, new connections would established anyway,
   * and the pool would not rely in the existing ones.
   */
  private agentStore: Record<string, Record<string, Map<number, NetworkAgent>>>;
  private logger: Logger;

  constructor(
    logger: Logger,
    private defaultAgentConfig: HttpAgentOptions = {
      keepAlive: true,
      keepAliveMsecs: 50000,
      maxSockets: 256,
      maxFreeSockets: 256,
      scheduling: 'lifo',
    }
  ) {
    this.logger = logger;
    this.agentStore = {
      'http:': {},
      'https:': {},
    };
  }

  public getAgentFactory(
    type: string,
    agentOptions?: HttpAgentOptions | UndiciAgentOptions | AgentFactory | false
  ): AgentFactory {
    if (isAgentFactory(agentOptions)) {
      // use the user-provided factory directly
      return agentOptions;
    }

    const createdAt = Date.now();
    const validAgentConfig = assertValidAgentConfig(agentOptions);

    return (connectionOpts: ConnectionOptions): NetworkAgent => {
      const agentsByType = this.agentStore[connectionOpts.url.protocol];

      if (!agentsByType) {
        throw new Error(`Unsupported protocol: '${connectionOpts.url.protocol}'`);
      }

      let agentInstances = agentsByType[type];
      const firstOfType = !agentInstances;

      if (firstOfType) {
        agentInstances = new Map();
        agentsByType[type] = agentInstances;
      }

      const currentAgentConfig = Object.assign(
        {},
        this.defaultAgentConfig,
        validAgentConfig,
        connectionOpts.tls
      );

      const agentTuple = agentInstances.get(createdAt);

      if (agentTuple) {
        return agentTuple;
      }

      // we did NOT find an agent for the same protocol, type and Client instance => create one
      if (!firstOfType) {
        this.logger.warn(
          `Requesting HTTP Agent of type ${type} for a new ES Client.
          This is not optimal since the existing instance cannot be reused.
          Please consider reusing the existing ES Client instance instead`
        );
      }
      const agent =
        connectionOpts.url.protocol === 'http:'
          ? new HttpAgent(currentAgentConfig)
          : new HttpsAgent(currentAgentConfig);

      // add the new Agent instance (createdAt => instance) to the Map of instances of that type
      agentInstances.set(createdAt, agent);

      return agent;
    };
  }
}

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
