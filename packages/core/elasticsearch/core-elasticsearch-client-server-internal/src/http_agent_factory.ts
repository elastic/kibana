/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ConnectionOptions, HttpAgentOptions } from '@elastic/elasticsearch';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';

export type NetworkAgent = HttpAgent | HttpsAgent;

const agentsMaps: Record<string, Record<string, NetworkAgent>> = {
  'http:': {},
  'https:': {},
};

export const httpAgentFactory = (type: string, agentOptions?: HttpAgentOptions) => {
  return (connectionOpts: ConnectionOptions): NetworkAgent => {
    const agentMap = agentsMaps[connectionOpts.url.protocol];

    if (!agentMap) {
      throw new Error(`Unsupported protocol: '${connectionOpts.url.protocol}'`);
    }

    let agent = agentMap[type];

    if (!agent) {
      agent =
        connectionOpts.url.protocol === 'http:'
          ? new HttpAgent(agentOptions)
          : new HttpsAgent(agentOptions);
      agentMap[type] = agent;
    }

    return agent;
  };
};
