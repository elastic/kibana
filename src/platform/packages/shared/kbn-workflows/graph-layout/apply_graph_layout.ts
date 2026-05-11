/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import dagre, { graphlib } from '@dagrejs/dagre';
import type { ForeachGroup, GraphEdge, LayoutedNode, PreLayoutNode } from './types';
import { DEFAULT_NODE_STYLE } from './types';

const GROUP_PADDING_TOP = 48;
const GROUP_PADDING_X = 24;
const GROUP_PADDING_BOTTOM = 24;

function applyDagre(
  nodes: PreLayoutNode[],
  edges: GraphEdge[]
): { nodes: LayoutedNode[]; edges: GraphEdge[] } {
  const g = new graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'TB',
    align: 'UL',
    ranker: 'tight-tree',
    nodesep: 50,
    ranksep: 80,
    edgesep: 40,
  });

  for (const node of nodes) {
    g.setNode(node.id, { width: node.style.width, height: node.style.height });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target, { label: edge.id });
  }

  dagre.layout(g);

  const layouted: LayoutedNode[] = nodes.map((node) => {
    const dagreNode = g.node(node.id);
    if (!dagreNode) {
      throw new Error(`Dagre layout produced no position for node "${node.id}"`);
    }
    return {
      ...node,
      style: { width: dagreNode.width, height: dagreNode.height },
      position: {
        x: dagreNode.x - dagreNode.width / 2,
        y: dagreNode.y - dagreNode.height / 2,
      },
    };
  });

  const routedEdges: GraphEdge[] = edges.map((edge) => {
    const dagreEdge = g.edge(edge.source, edge.target);
    const points = dagreEdge?.points;
    if (!points || points.length < 2) return edge;
    return { ...edge, points: points.map((p) => ({ x: p.x, y: p.y })) };
  });

  return { nodes: layouted, edges: routedEdges };
}

interface ForeachGroupLayout {
  layoutedInnerNodes: LayoutedNode[];
  innerEdges: GraphEdge[];
  groupWidth: number;
  groupHeight: number;
}

export function layoutForeachGroup(group: ForeachGroup): ForeachGroupLayout {
  if (group.innerNodes.length === 0) {
    return {
      layoutedInnerNodes: [],
      innerEdges: group.innerEdges,
      groupWidth: DEFAULT_NODE_STYLE.width,
      groupHeight: DEFAULT_NODE_STYLE.height,
    };
  }

  const { nodes: innerLayouted, edges: innerEdges } = applyDagre(
    group.innerNodes,
    group.innerEdges
  );

  const minX = Math.min(...innerLayouted.map((n) => n.position.x));
  const minY = Math.min(...innerLayouted.map((n) => n.position.y));
  const maxX = Math.max(...innerLayouted.map((n) => n.position.x + n.style.width));
  const maxY = Math.max(...innerLayouted.map((n) => n.position.y + n.style.height));

  // Shift all inner nodes so the bounding box starts at (GROUP_PADDING_X, GROUP_PADDING_TOP)
  const shifted = innerLayouted.map((n) => ({
    ...n,
    position: {
      x: n.position.x - minX + GROUP_PADDING_X,
      y: n.position.y - minY + GROUP_PADDING_TOP,
    },
  }));

  return {
    layoutedInnerNodes: shifted,
    innerEdges,
    groupWidth: maxX - minX + GROUP_PADDING_X * 2,
    groupHeight: maxY - minY + GROUP_PADDING_TOP + GROUP_PADDING_BOTTOM,
  };
}

export interface ApplyLayoutResult {
  nodes: LayoutedNode[];
  edges: GraphEdge[];
}

/**
 * Lays out the workflow graph top-to-bottom using dagre.
 *
 * For each `foreachGroup` we lay out the inner subgraph independently, size
 * the group container to its bounding box, and place the inner nodes with
 * `parentId`/`extent: 'parent'` so React Flow nests them inside the group.
 *
 * Throws if dagre fails to produce positions for any node — caller can route
 * to telemetry / fallback.
 */
export function applyGraphLayout(
  nodes: PreLayoutNode[],
  edges: GraphEdge[],
  foreachGroups: ForeachGroup[] = []
): ApplyLayoutResult {
  // 1. Lay out inner subgraphs and resize their group containers.
  const groupSizing = new Map<string, { width: number; height: number }>();
  const groupInnerById = new Map<
    string,
    { layoutedInnerNodes: LayoutedNode[]; innerEdges: GraphEdge[] }
  >();
  for (const group of foreachGroups) {
    const r = layoutForeachGroup(group);
    groupSizing.set(group.id, { width: r.groupWidth, height: r.groupHeight });
    groupInnerById.set(group.id, {
      layoutedInnerNodes: r.layoutedInnerNodes,
      innerEdges: r.innerEdges,
    });
  }

  // 2. Lay out the outer graph, using resized dims for foreach group nodes.
  const outerNodes = nodes.map((n) => {
    const sizing = groupSizing.get(n.id);
    if (sizing) {
      return { ...n, style: { width: sizing.width, height: sizing.height } };
    }
    return n;
  });

  const outerLayout = applyDagre(outerNodes, edges);

  // 3. Splice inner nodes back in at absolute positions (React Flow uses
  //    relative-to-parent positions when `extent: 'parent'`, so keep relative).
  const finalNodes: LayoutedNode[] = [...outerLayout.nodes];
  const finalEdges: GraphEdge[] = [...outerLayout.edges];
  for (const [, inner] of groupInnerById) {
    finalNodes.push(...inner.layoutedInnerNodes);
    finalEdges.push(...inner.innerEdges);
  }

  return { nodes: finalNodes, edges: finalEdges };
}
