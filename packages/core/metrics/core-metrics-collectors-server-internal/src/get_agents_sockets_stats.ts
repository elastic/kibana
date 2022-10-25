/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { NetworkAgent } from '@kbn/core-elasticsearch-client-server-internal';
import { Agent as HttpsAgent } from 'https';
import { mean } from 'lodash';
import type {
  ElasticsearchClientProtocol,
  ElasticsearchClientsMetrics,
} from '@kbn/core-metrics-server';

export const getAgentsSocketsStats = (agents: Set<NetworkAgent>): ElasticsearchClientsMetrics => {
  const nodes = new Set<string>();
  let totalActiveSockets = 0;
  let totalIdleSockets = 0;
  let totalQueuedRequests = 0;
  let http: boolean = false;
  let https: boolean = false;

  const nodesWithActiveSockets: Record<string, number> = {};
  const nodesWithIdleSockets: Record<string, number> = {};

  agents.forEach((agent) => {
    const agentRequests = Object.entries(agent.requests) ?? [];
    const agentSockets = Object.entries(agent.sockets) ?? [];
    const agentFreeSockets = Object.entries(agent.freeSockets) ?? [];

    if (agentRequests.length || agentSockets.length || agentFreeSockets.length) {
      if (agent instanceof HttpsAgent) https = true;
      else http = true;

      agentRequests.forEach(([node, queue]) => {
        nodes.add(node);
        totalQueuedRequests += queue?.length ?? 0;
      });

      agentSockets.forEach(([node, sockets]) => {
        nodes.add(node);
        const activeSockets = sockets?.length ?? 0;
        totalActiveSockets += activeSockets;
        nodesWithActiveSockets[node] = (nodesWithActiveSockets[node] ?? 0) + activeSockets;
      });

      agentFreeSockets.forEach(([node, freeSockets]) => {
        nodes.add(node);
        const idleSockets = freeSockets?.length ?? 0;
        totalIdleSockets += idleSockets;
        nodesWithIdleSockets[node] = (nodesWithIdleSockets[node] ?? 0) + idleSockets;
      });
    }
  });

  const activeSocketCounters = Object.values(nodesWithActiveSockets);
  const idleSocketCounters = Object.values(nodesWithIdleSockets);
  const protocol: ElasticsearchClientProtocol = http
    ? https
      ? 'mixed'
      : 'http'
    : https
    ? 'https'
    : 'none';

  return {
    protocol,
    connectedNodes: nodes.size,
    nodesWithActiveSockets: activeSocketCounters.filter(Boolean).length,
    nodesWithIdleSockets: idleSocketCounters.filter(Boolean).length,
    totalActiveSockets,
    totalIdleSockets,
    totalQueuedRequests,
    mostActiveNodeSockets: activeSocketCounters.length ? Math.max(...activeSocketCounters) : 0,
    averageActiveSocketsPerNode: activeSocketCounters.length ? mean(activeSocketCounters) : 0,
    mostIdleNodeSockets: idleSocketCounters.length ? Math.max(...idleSocketCounters) : 0,
    averageIdleSocketsPerNode: idleSocketCounters.length ? mean(idleSocketCounters) : 0,
  };
};
