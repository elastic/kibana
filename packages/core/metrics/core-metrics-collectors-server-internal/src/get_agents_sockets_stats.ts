/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Agent } from 'http';
import { mean } from 'lodash';
import type { ElasticsearchClientsMetrics } from '@kbn/core-metrics-server';

export const getAgentsSocketsStats = (agents: Set<Agent>): ElasticsearchClientsMetrics => {
  const nodes = new Set<string>();
  let totalActiveSockets = 0;
  let totalIdleSockets = 0;
  let totalQueuedRequests = 0;

  const nodesWithActiveSockets: Record<string, number> = {};
  const nodesWithIdleSockets: Record<string, number> = {};

  agents.forEach((agent) => {
    Object.values(agent.requests ?? []).forEach(
      (queue) => (totalQueuedRequests += queue?.length ?? 0)
    );

    Object.entries(agent.sockets ?? []).forEach(([node, sockets]) => {
      nodes.add(node);
      totalActiveSockets += sockets?.length ?? 0;
      nodesWithActiveSockets[node] = (nodesWithActiveSockets[node] ?? 0) + (sockets?.length ?? 0);
    });

    Object.entries(agent.freeSockets ?? []).forEach(([node, freeSockets]) => {
      nodes.add(node);
      totalIdleSockets += freeSockets?.length ?? 0;
      nodesWithIdleSockets[node] = (nodesWithIdleSockets[node] ?? 0) + (freeSockets?.length ?? 0);
    });
  });

  const activeSocketCounters = Object.values(nodesWithActiveSockets);
  const idleSocketCounters = Object.values(nodesWithIdleSockets);

  return {
    agents: agents.size,
    connectedNodes: nodes.size,
    nodesWithActiveSockets: activeSocketCounters.length,
    nodesWithIdleSockets: idleSocketCounters.length,
    totalActiveSockets,
    totalIdleSockets,
    totalQueuedRequests,
    mostActiveNodeSockets: Math.max(...activeSocketCounters),
    averageActiveSocketsPerNode: mean(activeSocketCounters),
    mostIdleNodeSockets: Math.max(...idleSocketCounters),
    averageIdleSocketsPerNode: mean(idleSocketCounters),
  };
};
