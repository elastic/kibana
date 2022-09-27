/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Agent } from 'http';
import { Agent as HttpsAgent } from 'https';
import { mean } from 'lodash';
import type {
  ElasticsearchClientProtocol,
  ElasticsearchClientsMetrics,
} from '@kbn/core-metrics-server';

export const getAgentsSocketsStats = (agents: Set<Agent>): ElasticsearchClientsMetrics => {
  const nodes = new Set<string>();
  let totalActiveSockets = 0;
  let totalIdleSockets = 0;
  let totalQueuedRequests = 0;
  let http: boolean = false;
  let https: boolean = false;

  const nodesWithActiveSockets: Record<string, number> = {};
  const nodesWithIdleSockets: Record<string, number> = {};

  agents.forEach((agent) => {
    if (agent instanceof HttpsAgent) https = true;
    else http = true;

    Object.values(agent.requests ?? []).forEach(
      (queue) => (totalQueuedRequests += queue?.length ?? 0)
    );

    Object.entries(agent.sockets ?? []).forEach(([node, sockets]) => {
      nodes.add(node);
      const activeSockets = sockets?.length ?? 0;
      totalActiveSockets += activeSockets;
      nodesWithActiveSockets[node] = (nodesWithActiveSockets[node] ?? 0) + activeSockets;
    });

    Object.entries(agent.freeSockets ?? []).forEach(([node, freeSockets]) => {
      nodes.add(node);
      const idleSockets = freeSockets?.length ?? 0;
      totalIdleSockets += idleSockets;
      nodesWithIdleSockets[node] = (nodesWithIdleSockets[node] ?? 0) + idleSockets;
    });
  });

  const activeSocketCounters = Object.values(nodesWithActiveSockets);
  const idleSocketCounters = Object.values(nodesWithIdleSockets);
  let protocol: ElasticsearchClientProtocol;

  if (http && https) protocol = 'mixed';
  else if (https) protocol = 'https';
  else if (http) protocol = 'http';
  else protocol = 'none';

  return {
    protocol,
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
