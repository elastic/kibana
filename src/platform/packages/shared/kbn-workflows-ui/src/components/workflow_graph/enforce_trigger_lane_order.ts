/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DagPositionedEdge, DagPositionedNode } from '@kbn/dag-layout';
import type { LayoutDirection } from '@kbn/workflows';

export interface EnforceTriggerLaneOrderInput {
  readonly nodes: readonly DagPositionedNode[];
  readonly edges: readonly DagPositionedEdge[];
  /** Trigger node ids in YAML declaration order (first → last). */
  readonly triggerIds: readonly string[];
  readonly direction: LayoutDirection;
}

/**
 * After dagre layout, force trigger nodes into declaration order along the
 * cross-axis (left→right in TB, top→bottom in LR). Dagre's fan-in ordering can
 * reverse them, which puts a newly appended trigger on the opposite side of
 * the "Add trigger" control (anchored past the last visual trigger).
 */
export const enforceTriggerLaneOrder = ({
  nodes,
  edges,
  triggerIds,
  direction,
}: EnforceTriggerLaneOrderInput): { nodes: DagPositionedNode[]; edges: DagPositionedEdge[] } => {
  if (triggerIds.length < 2) return { nodes: [...nodes], edges: [...edges] };

  const cross: 'x' | 'y' = direction === 'LR' ? 'y' : 'x';
  const byId = new Map(nodes.map((n) => [n.id, { ...n }]));
  const triggers = triggerIds
    .map((id) => byId.get(id))
    .filter((n): n is DagPositionedNode => n !== undefined);
  if (triggers.length < 2) return { nodes: [...nodes], edges: [...edges] };

  const originalCross = triggers.map((t) => t[cross]);
  let alreadyOk = true;
  for (let i = 0; i < originalCross.length - 1; i++) {
    if (originalCross[i] > originalCross[i + 1]) {
      alreadyOk = false;
      break;
    }
  }
  if (alreadyOk) return { nodes: [...nodes], edges: [...edges] };

  const sortedCross = [...originalCross].sort((a, b) => a - b);
  const deltaById = new Map<string, number>();
  for (let i = 0; i < triggers.length; i++) {
    const delta = sortedCross[i] - originalCross[i];
    if (delta === 0) continue;
    triggers[i][cross] += delta;
    deltaById.set(triggers[i].id, delta);
  }

  const nextEdges = edges.map((edge) => {
    const ds = deltaById.get(edge.source) ?? 0;
    const dt = deltaById.get(edge.target) ?? 0;
    if (edge.points.length === 0) return edge;
    if (ds === dt) {
      if (ds === 0) return edge;
      return {
        ...edge,
        points: edge.points.map((p) => ({ ...p, [cross]: p[cross] + ds })),
      };
    }
    return { ...edge, points: [] };
  });

  return { nodes: [...byId.values()], edges: nextEdges };
};
