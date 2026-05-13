/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import dagre, { graphlib } from '@dagrejs/dagre';
import { Position } from '@xyflow/react';
import type { ForeachGroup, GraphEdge, LayoutedNode, PreLayoutNode } from './types';
import { DEFAULT_NODE_STYLE } from './types';

const GROUP_PADDING_TOP = 48;
const GROUP_PADDING_X = 24;
const GROUP_PADDING_BOTTOM = 24;

export type LayoutDirection = 'TB' | 'LR';

interface ApplyDagreInternalOptions {
  /**
   * Compact spacing for the preview popover — minimap-style minimal gaps
   * between nodes so the entire graph fits in a small box.
   */
  compact?: boolean;
}

function applyDagre(
  nodes: PreLayoutNode[],
  edges: GraphEdge[],
  direction: LayoutDirection = 'TB',
  options: ApplyDagreInternalOptions = {}
): { nodes: LayoutedNode[]; edges: GraphEdge[] } {
  const g = new graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    align: 'UL',
    ranker: 'tight-tree',
    nodesep: options.compact ? 8 : 50,
    ranksep: options.compact ? 16 : 80,
    edgesep: options.compact ? 8 : 40,
  });

  for (const node of nodes) {
    g.setNode(node.id, { width: node.style.width, height: node.style.height });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target, { label: edge.id });
  }

  dagre.layout(g);

  const isHorizontal = direction === 'LR';
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
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
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

export function layoutForeachGroup(
  group: ForeachGroup,
  direction: LayoutDirection = 'TB',
  options: ApplyDagreInternalOptions = {}
): ForeachGroupLayout {
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
    group.innerEdges,
    direction,
    options
  );

  const padTop = options.compact ? 24 : GROUP_PADDING_TOP;
  const padX = options.compact ? 12 : GROUP_PADDING_X;
  const padBottom = options.compact ? 12 : GROUP_PADDING_BOTTOM;

  const minX = Math.min(...innerLayouted.map((n) => n.position.x));
  const minY = Math.min(...innerLayouted.map((n) => n.position.y));
  const maxX = Math.max(...innerLayouted.map((n) => n.position.x + n.style.width));
  const maxY = Math.max(...innerLayouted.map((n) => n.position.y + n.style.height));

  // Shift all inner nodes so the bounding box starts at (padX, padTop)
  const shifted = innerLayouted.map((n) => ({
    ...n,
    position: {
      x: n.position.x - minX + padX,
      y: n.position.y - minY + padTop,
    },
  }));

  return {
    layoutedInnerNodes: shifted,
    innerEdges,
    groupWidth: maxX - minX + padX * 2,
    groupHeight: maxY - minY + padTop + padBottom,
  };
}

export interface ApplyLayoutResult {
  nodes: LayoutedNode[];
  edges: GraphEdge[];
}

export interface ApplyLayoutOptions {
  /** Dagre rank direction: `'TB'` (default, top-to-bottom) or `'LR'` (left-to-right). */
  direction?: LayoutDirection;
  /**
   * Compact spacing for the preview popover — tight minimap-style gaps so
   * the entire graph fits in a small box.
   */
  compact?: boolean;
}

/**
 * Lays out the workflow graph using dagre.
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
  foreachGroups: ForeachGroup[] = [],
  options: ApplyLayoutOptions = {}
): ApplyLayoutResult {
  const direction = options.direction ?? 'TB';
  const compact = options.compact ?? false;

  // 1. Lay out inner subgraphs and resize their group containers.
  const groupSizing = new Map<string, { width: number; height: number }>();
  const groupInnerById = new Map<
    string,
    { layoutedInnerNodes: LayoutedNode[]; innerEdges: GraphEdge[] }
  >();
  for (const group of foreachGroups) {
    const r = layoutForeachGroup(group, direction, { compact });
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

  const outerLayout = applyDagre(outerNodes, edges, direction, { compact });

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
