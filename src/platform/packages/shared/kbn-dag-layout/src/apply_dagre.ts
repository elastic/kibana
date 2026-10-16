/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import dagre, { graphlib } from '@dagrejs/dagre';
import {
  alignDagreCrossAxisInPlace,
  type CrossAxis,
  separateRankOverlapsInPlace,
} from './align_cross_axis';
import { DAGRE_EDGE_SEP } from './constants';
import type { DagEdge, DagLayoutDirection, DagNode, DagPositionedNode } from './types';

/**
 * Runs dagre (ranks depend on the edges), re-centres the cross axis on the
 * barycenter of each node's neighbours, and returns the node boxes.
 */
export function applyDagre(
  nodes: readonly DagNode[],
  edges: readonly DagEdge[],
  direction: DagLayoutDirection,
  nodeSep: number,
  rankSep: number
): DagPositionedNode[] {
  const g = new graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    ranker: 'tight-tree',
    nodesep: nodeSep,
    ranksep: rankSep,
    edgesep: DAGRE_EDGE_SEP,
  });

  for (const node of nodes) {
    g.setNode(node.id, { width: node.width, height: node.height });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  const crossAxis: CrossAxis = direction === 'LR' ? 'y' : 'x';
  alignDagreCrossAxisInPlace(g, crossAxis, nodeSep);
  // The barycenter pass can pull a wide subtree's head across its rank until it
  // overlaps a sibling; restore dagre's non-overlap guarantee before positions
  // are read.
  separateRankOverlapsInPlace(g, crossAxis, nodeSep);

  return nodes.map((node) => {
    const dagreNode = g.node(node.id);
    if (!dagreNode) {
      throw new Error(`Dagre layout produced no position for node "${node.id}"`);
    }
    return {
      id: node.id,
      x: dagreNode.x - dagreNode.width / 2,
      y: dagreNode.y - dagreNode.height / 2,
      width: dagreNode.width,
      height: dagreNode.height,
    };
  });
}
