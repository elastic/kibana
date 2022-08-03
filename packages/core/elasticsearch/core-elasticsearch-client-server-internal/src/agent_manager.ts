/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isDeepStrictEqual } from 'util';
import { ConnectionOptions, HttpAgentOptions, UndiciAgentOptions } from '@elastic/elasticsearch';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';

export type NetworkAgent = HttpAgent | HttpsAgent;
export type AgentFactory = (connectionOpts: ConnectionOptions) => NetworkAgent;

/** @internal **/
export class AgentManager {
  // holds references to agents by type, for each protocol, e.g.:
  // {
  //   'https:': {
  //     data: agentInstance1,
  //     monitoring: agentInstance2,
  //     }
  // }
  private agentsMaps: Record<string, Record<string, [NetworkAgent, HttpAgentOptions]>> = {
    'http:': {},
    'https:': {},
  };

  public getAgentFactory(
    type: string,
    agentOptions?: HttpAgentOptions | UndiciAgentOptions | AgentFactory | false
  ): AgentFactory {
    const config = assertValidAgentConfig(agentOptions);

    if (isAgentFactory(config)) {
      // use the user-provided factory directly
      return config;
    }

    return (connectionOpts: ConnectionOptions): NetworkAgent => {
      const agentMap = this.agentsMaps[connectionOpts.url.protocol];
      if (!agentMap) {
        throw new Error(`Unsupported protocol: '${connectionOpts.url.protocol}'`);
      }

      let agentTuple = agentMap[type];

      if (agentTuple) {
        const [agent, initialConfig] = agentTuple;
        if (!sameAgentConfiguration(initialConfig, config)) {
          throw new Error(
            `Attempted to retrieve HTTP Agent instances of the same type '${type}' using different configurations`
          );
        }
        return agent;
      } else {
        const agent =
          connectionOpts.url.protocol === 'https:' ? new HttpsAgent(config) : new HttpAgent(config);
        agentTuple = [agent, config];
        agentMap[type] = agentTuple;
      }

      return agentTuple[0];
    };
  }
}

const sameAgentConfiguration = (
  initialConfig: HttpAgentOptions | AgentFactory,
  newConfig: HttpAgentOptions | AgentFactory
): boolean => {
  if (isAgentFactory(initialConfig)) {
    return isAgentFactory(newConfig) && initialConfig === newConfig;
  }

  return isDeepStrictEqual(initialConfig, newConfig);
};

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
