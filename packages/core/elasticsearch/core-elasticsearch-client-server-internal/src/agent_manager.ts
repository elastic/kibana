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
import { ConnectionOptions, HttpAgentOptions, UndiciAgentOptions } from '@elastic/elasticsearch';
import { Logger } from '@kbn/logging';

export type NetworkAgent = HttpAgent | HttpsAgent;
export type AgentFactory = (connectionOpts: ConnectionOptions) => NetworkAgent;

/** @internal **/
export class AgentManager {
  // store Agent instances by protocol => type => configuration, e.g.:
  // {
  //   'https:': {
  //     data: [[dataAgentConfig1, dataAgentInstance1], [dataAgentConfig2, dataAgentInstance2]]
  //     monitoring: [[monitoringAgentConfig1, monitoringAgentInstance1]]
  //     }
  // }
  private agentStore: Record<string, Record<string, Array<[HttpAgentOptions, NetworkAgent]>>>;
  private logger: Logger;

  constructor(
    logger: Logger,
    private defaultAgentConfig: HttpAgentOptions = {
      keepAlive: true,
      keepAliveMsecs: 1000,
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

    const validAgentConfig = assertValidAgentConfig(agentOptions);

    const baseConfig = Object.assign({}, this.defaultAgentConfig, validAgentConfig);

    return (connectionOpts: ConnectionOptions): NetworkAgent => {
      const agentsByType = this.agentStore[connectionOpts.url.protocol];

      if (!agentsByType) {
        throw new Error(`Unsupported protocol: '${connectionOpts.url.protocol}'`);
      }

      let agentInstances = agentsByType[type];
      const firstOfType = !agentInstances;

      if (firstOfType) {
        agentInstances = [];
        agentsByType[type] = agentInstances;
      }

      const currentConfig = Object.assign({}, baseConfig, connectionOpts.tls);

      const agentTuple = agentInstances.find(([config]) =>
        isDeepStrictEqual(config, currentConfig)
      );

      if (agentTuple) {
        return agentTuple[1];
      }

      if (!firstOfType) {
        this.logger.warn(
          `Requesting HTTP Agent of type ${type} with a new configuration. This is not optimal since the existing instance cannot be reused`
        );
      }
      // we did NOT find an agent for the same protocol, type and configuration => create one
      const agent =
        connectionOpts.url.protocol === 'http:'
          ? new HttpAgent(currentConfig)
          : new HttpsAgent(currentConfig);

      // add the new tuple [config, agentInstance] to the list of tuples for that type
      agentInstances.push([currentConfig, agent]);

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
