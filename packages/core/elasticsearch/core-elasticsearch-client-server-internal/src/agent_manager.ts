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

const HTTP = 'http:';
const HTTPS = 'https:';

export type Protocol = typeof HTTP | typeof HTTPS;
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
  /**
   * Store Agent instances by type and protocol, e.g.:
   *
   * data: {
   *   'http:': [agentInstance1, agentInstance2],
   *   'https:': [agentInstance3, agentInstance4]
   * },
   * monitoring: {
   *   'http:': [],
   *   'https:': [agentInstance5]
   * }
   */
  private agentStore: Record<string, Record<Protocol, Array<NetworkAgent | undefined>>>;
  private logger: Logger;

  constructor(
    logger: Logger,
    private defaultConfig: HttpAgentOptions = {
      keepAlive: true,
      keepAliveMsecs: 50000,
      maxSockets: 256,
      maxFreeSockets: 256,
      scheduling: 'lifo',
    }
  ) {
    this.logger = logger;
    this.agentStore = {};
  }

  public getAgentFactory(
    type: string,
    agentOptions?: HttpAgentOptions | UndiciAgentOptions | AgentFactory | false
  ): AgentFactory {
    if (isAgentFactory(agentOptions)) {
      // use the user-provided factory directly
      return agentOptions;
    }

    const agentConfig = assertValidAgentConfig(agentOptions);

    // a given agent factory (of a given type) always provides the same Agent instances (for the same protocol)
    // we keep the indexes for each protocol, so that we can access them later on, when the factory is invoked
    const { httpInstanceIndex, httpsInstanceIndex } = this.initTypeStore(type);

    return (connectionOpts: ConnectionOptions): NetworkAgent => {
      const agents = this.getAgentInstances(type, connectionOpts);

      // when the factory is called for a given connection (and protocol), we use the appropriate index
      const agentIndex = isHttps(connectionOpts) ? httpsInstanceIndex : httpInstanceIndex;

      let agent = agents[agentIndex];

      if (!agent) {
        agent = this.createAgent(agentConfig, connectionOpts);

        // Allow GC'ing the Agent after it has been terminated
        const doDestroy = agent.destroy.bind(agent);
        agent.destroy = () => {
          doDestroy();
          agents[agentIndex] = undefined;
        };

        // add the new Agent instance to the list of instances of that type
        agents[agentIndex] = agent;
      }

      return agent;
    };
  }

  private initTypeStore(type: string): { httpInstanceIndex: number; httpsInstanceIndex: number } {
    let agentsOfType = this.agentStore[type];

    if (!agentsOfType) {
      agentsOfType = {
        [HTTP]: [],
        [HTTPS]: [],
      };

      this.agentStore[type] = agentsOfType;
    } else {
      this.logger.warn(
        `An Agent factory for type ${type} has already been retrieved.
        This is not optimal since the existing instance cannot be reused.
        Please consider reusing the previously retrieved factory instead`
      );
    }

    const httpInstanceIndex = agentsOfType[HTTP].length;
    const httpsInstanceIndex = agentsOfType[HTTPS].length;

    agentsOfType[HTTP].push(undefined);
    agentsOfType[HTTPS].push(undefined);
    return { httpInstanceIndex, httpsInstanceIndex };
  }

  private getAgentInstances(
    type: string,
    connectionOpts: ConnectionOptions
  ): Array<NetworkAgent | undefined> {
    let protocol: Protocol;

    switch (connectionOpts.url.protocol) {
      case 'http:':
        protocol = HTTP;
        break;
      case 'https:':
        protocol = HTTPS;
        break;
      default:
        throw new Error(`Unsupported protocol: '${connectionOpts.url.protocol}'`);
    }

    return this.agentStore[type][protocol];
  }

  private createAgent(agentConfig: HttpAgentOptions, connectionOpts: ConnectionOptions) {
    const config = Object.assign({}, this.defaultConfig, agentConfig, connectionOpts.tls);
    return isHttps(connectionOpts) ? new HttpsAgent(config) : new HttpAgent(config);
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
