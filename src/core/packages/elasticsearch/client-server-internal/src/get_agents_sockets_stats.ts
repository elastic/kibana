/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClientsMetrics } from '@kbn/core-metrics-server';
import type { NetworkAgent } from './agent_manager';

export const getAgentsSocketsStats = (agents: Set<NetworkAgent>): ElasticsearchClientsMetrics => {
  const nodes = new Set<string>();
  let totalActiveSockets = 0;
  let totalIdleSockets = 0;
  let totalQueuedRequests = 0;

  agents.forEach((agent) => {
    const agentRequests = Object.entries(agent.requests) ?? [];
    const agentSockets = Object.entries(agent.sockets) ?? [];
    const agentFreeSockets = Object.entries(agent.freeSockets) ?? [];

    if (agentRequests.length || agentSockets.length || agentFreeSockets.length) {
      agentRequests.forEach(([node, queue]) => {
        nodes.add(node);
        totalQueuedRequests += queue?.length ?? 0;
      });

      agentSockets.forEach(([node, sockets]) => {
        nodes.add(node);
        const activeSockets = sockets?.length ?? 0;
        totalActiveSockets += activeSockets;
      });

      agentFreeSockets.forEach(([node, freeSockets]) => {
        nodes.add(node);
        const idleSockets = freeSockets?.length ?? 0;
        totalIdleSockets += idleSockets;
      });
    }
  });

  return {
    totalActiveSockets,
    totalIdleSockets,
    totalQueuedRequests,
  };
};
