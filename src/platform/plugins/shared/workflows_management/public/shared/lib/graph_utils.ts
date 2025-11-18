/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { graphlib } from '@dagrejs/dagre';

export function getAllPredecessors(graph: graphlib.Graph, nodeId: string): string[] {
  const predecessors = graph.predecessors(nodeId);
  if (!predecessors) {
    return [];
  }
  return predecessors.flatMap((predecessor) => [
    predecessor,
    ...getAllPredecessors(graph, predecessor),
  ]);
}

export function getTriggerLabel(triggerType: string) {
  switch (triggerType) {
    case 'manual':
      return 'Manual';
    case 'alert':
      return 'Alert';
    case 'scheduled':
      return 'Scheduled';
    default:
      return triggerType;
  }
}
