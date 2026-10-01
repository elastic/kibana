/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DagPositionedEdge, DagPositionedNode } from '@kbn/dag-layout';
import type { GraphEdge, LayoutDirection } from '@kbn/workflows';

/**
 * Visual lane order along the cross-axis (left→right in TB, top→bottom in LR),
 * matching port reading order true → false → error.
 */
const lanePriority = (e: GraphEdge): number | undefined => {
  if (e.branchType === 'then') return 0;
  if (e.branchType === 'else') return 1;
  if (e.isFailure) return 2;
  return undefined;
};

const isForkOut = (e: GraphEdge): boolean => lanePriority(e) !== undefined;

/**
 * Nodes reachable from `start` by following outgoing edges, without entering
 * any id in `blocked` (other fork heads).
 */
const reachableExclusive = (
  start: string,
  outgoing: ReadonlyMap<string, readonly string[]>,
  blocked: ReadonlySet<string>
): Set<string> => {
  const seen = new Set<string>();
  const stack = [start];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (seen.has(id) || (id !== start && blocked.has(id))) continue;
    seen.add(id);
    for (const next of outgoing.get(id) ?? []) {
      stack.push(next);
    }
  }
  return seen;
};

export interface EnforceForkLaneOrderInput {
  readonly nodes: readonly DagPositionedNode[];
  readonly edges: readonly DagPositionedEdge[];
  /** Domain edges (top-level + compound inner) carrying branchType / isFailure. */
  readonly domainEdges: readonly GraphEdge[];
  readonly direction: LayoutDirection;
}

/**
 * After dagre layout, force if/switch fork lanes into true → false → error
 * order. Dagre's ordering phase can flip branches when depths differ (e.g.
 * adding a second step on `else` while `then` is a longer chain), which makes
 * paths leave the wrong side of the port row.
 *
 * Shared join nodes (reachable from more than one fork head) are left in place
 * so diamond merges are not yanked sideways twice.
 */
export const enforceForkLaneOrder = ({
  nodes,
  edges,
  domainEdges,
  direction,
}: EnforceForkLaneOrderInput): { nodes: DagPositionedNode[]; edges: DagPositionedEdge[] } => {
  const cross: 'x' | 'y' = direction === 'LR' ? 'y' : 'x';
  const byId = new Map(nodes.map((n) => [n.id, { ...n }]));
  const deltaById = new Map<string, number>();

  const outgoing = new Map<string, string[]>();
  for (const e of domainEdges) {
    const list = outgoing.get(e.source);
    if (list) list.push(e.target);
    else outgoing.set(e.source, [e.target]);
  }

  const forksBySource = new Map<string, GraphEdge[]>();
  for (const e of domainEdges) {
    if (!isForkOut(e)) continue;
    const list = forksBySource.get(e.source);
    if (list) list.push(e);
    else forksBySource.set(e.source, [e]);
  }

  for (const outs of forksBySource.values()) {
    if (outs.length < 2) continue;

    const ordered = [...outs].sort(
      (a, b) => (lanePriority(a) as number) - (lanePriority(b) as number)
    );
    const heads = ordered.map((e) => e.target).filter((id) => byId.has(id));
    if (heads.length < 2) continue;

    const originalCross = heads.map((id) => byId.get(id)![cross]);
    const sortedCross = [...originalCross].sort((a, b) => a - b);
    let alreadyOk = true;
    for (let i = 0; i < heads.length - 1; i++) {
      if (originalCross[i] > originalCross[i + 1]) {
        alreadyOk = false;
        break;
      }
    }
    if (alreadyOk) continue;

    const headSet = new Set(heads);
    const reach = heads.map((head) => {
      const blocked = new Set([...headSet].filter((h) => h !== head));
      return reachableExclusive(head, outgoing, blocked);
    });
    const shared = new Set<string>();
    for (let i = 0; i < reach.length; i++) {
      for (const id of reach[i]) {
        for (let j = 0; j < reach.length; j++) {
          if (i !== j && reach[j].has(id)) shared.add(id);
        }
      }
    }

    for (let i = 0; i < heads.length; i++) {
      const head = heads[i];
      const delta = sortedCross[i] - originalCross[i];
      if (delta === 0) continue;
      for (const id of reach[i]) {
        if (shared.has(id)) continue;
        const node = byId.get(id);
        if (!node) continue;
        node[cross] += delta;
        deltaById.set(id, (deltaById.get(id) ?? 0) + delta);
      }
    }
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
    // Endpoints moved differently — drop stale dagre waypoints.
    return { ...edge, points: [] };
  });

  return { nodes: [...byId.values()], edges: nextEdges };
};
