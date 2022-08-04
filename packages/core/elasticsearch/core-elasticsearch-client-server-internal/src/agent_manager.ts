/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isDeepStrictEqual } from 'util';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';
import { HttpProxyAgent, HttpsProxyAgent } from 'hpagent';
import { ConnectionOptions, HttpAgentOptions, UndiciAgentOptions } from '@elastic/elasticsearch';

export type NetworkAgent = HttpAgent | HttpsAgent;
export type AgentFactory = (connectionOpts: ConnectionOptions) => NetworkAgent;

/** @internal **/
export class AgentManager {
  // keep references to agents by type, for each protocol, e.g.:
  // {
  //   'https:': {
  //     data: [dataAgentInstance, dataAgentConfig],
  //     monitoring: [monitoringAgentInstance, monitoringAgentConfig]
  //     }
  // }
  private agentsMaps: Record<string, Record<string, [NetworkAgent, HttpAgentOptions]>>;

  constructor(
    private defaultAgentConfig: HttpAgentOptions = {
      keepAlive: true,
      keepAliveMsecs: 1000,
      maxSockets: 256,
      maxFreeSockets: 256,
      scheduling: 'lifo',
    }
  ) {
    this.agentsMaps = {
      'http:': {},
      'https:': {},
    };
  }

  public getAgentFactory(
    type: string,
    agentOptions?: HttpAgentOptions | UndiciAgentOptions | AgentFactory | false
  ): AgentFactory {
    const validAgentConfig = assertValidAgentConfig(agentOptions);

    if (isAgentFactory(validAgentConfig)) {
      // use the user-provided factory directly
      return validAgentConfig;
    }

    const baseConfig = Object.assign({}, this.defaultAgentConfig, validAgentConfig);

    return (connectionOpts: ConnectionOptions): NetworkAgent => {
      const agentMap = this.agentsMaps[connectionOpts.url.protocol];

      if (!agentMap) {
        throw new Error(`Unsupported protocol: '${connectionOpts.url.protocol}'`);
      }

      let agentTuple = agentMap[type];

      if (agentTuple) {
        const [agent, initialConfig] = agentTuple;
        const currentConfig = Object.assign({}, baseConfig, {
          proxy: connectionOpts.proxy,
          tls: connectionOpts.tls,
        });
        if (!isDeepStrictEqual(initialConfig, currentConfig)) {
          throw new Error(
            `Attempted to retrieve HTTP Agent instances of the same type '${type}' using different configurations`
          );
        }
        return agent;
      } else {
        let agent;

        if (connectionOpts.proxy !== undefined) {
          const proxyConfig = Object.assign({}, baseConfig, {
            proxy: connectionOpts.proxy,
            tls: connectionOpts.tls,
          });
          agent =
            connectionOpts.url.protocol === 'https:'
              ? new HttpsProxyAgent(proxyConfig)
              : new HttpProxyAgent(proxyConfig);
          agentTuple = [agent, proxyConfig];
        } else {
          agent =
            connectionOpts.url.protocol === 'https:'
              ? new HttpsAgent(baseConfig)
              : new HttpAgent(baseConfig);
          agentTuple = [agent, baseConfig];
        }
        agentMap[type] = agentTuple;
      }

      return agentTuple[0];
    };
  }
}

const assertValidAgentConfig = (
  agentOptions?: HttpAgentOptions | UndiciAgentOptions | AgentFactory | false
): HttpAgentOptions | AgentFactory => {
  if (typeof agentOptions === 'function') {
    return agentOptions;
  } else if (!agentOptions) {
    return {};
  } else if (isHttpAgentOptions(agentOptions)) {
    return agentOptions;
  }

  throw new Error('Unsupported agent options: UndiciAgentOptions');
};

const isAgentFactory = (
  agentOptions: HttpAgentOptions | AgentFactory
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
