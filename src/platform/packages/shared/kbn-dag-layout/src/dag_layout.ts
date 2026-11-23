/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { translateEdgePoints } from './align_cross_axis';
import { DEFAULT_COMPOUND_PADDING } from './constants';
import { layoutGraphWithLanes } from './layout_graph_with_lanes';
import type {
  DagCompoundGroup,
  DagEdge,
  DagLayoutOptions,
  DagNode,
  DagPositionedEdge,
  DagPositionedNode,
  DagReservedLane,
  DagReservedLanePlacement,
} from './types';

const DEFAULT_NODE_SEP = 50;
const DEFAULT_RANK_SEP = 70;

interface CompoundGroupLayout {
  layoutedInnerNodes: DagPositionedNode[];
  innerEdges: DagPositionedEdge[];
  groupWidth: number;
  groupHeight: number;
  lanePlacements: DagReservedLanePlacement[];
}

function layoutCompoundGroup(
  group: DagCompoundGroup,
  direction: 'TB' | 'LR',
  nodeSep: number,
  rankSep: number,
  compoundPadding: Required<NonNullable<DagLayoutOptions['compoundPadding']>>,
  groupLanes: readonly DagReservedLane[]
): CompoundGroupLayout {
  const { top: padTop, right: padRight, bottom: padBottom, left: padLeft } = compoundPadding;

  const {
    nodes: innerLayouted,
    edges: innerEdges,
    lanePlacements,
  } = layoutGraphWithLanes(
    group.innerNodes,
    group.innerEdges,
    groupLanes,
    direction,
    nodeSep,
    rankSep
  );

  const minX = Math.min(...innerLayouted.map((n) => n.x));
  const minY = Math.min(...innerLayouted.map((n) => n.y));
  const maxX = Math.max(...innerLayouted.map((n) => n.x + n.width));
  const maxY = Math.max(...innerLayouted.map((n) => n.y + n.height));

  const shiftX = -minX + padLeft;
  const shiftY = -minY + padTop;

  const shifted = innerLayouted.map((n) => ({
    ...n,
    x: n.x + shiftX,
    y: n.y + shiftY,
  }));

  const shiftedInnerEdges = innerEdges.map((e) => ({
    ...e,
    points: translateEdgePoints(e.points, shiftX, shiftY),
  }));

  // Apply the same (shiftX, shiftY) that repositions inner nodes to lane
  // placements, so they stay in the same padded-group-local coordinate space.
  // dagLayout will later translate them further to root-absolute when finalising
  // inner nodes (adding the group's outer absolute position).
  const isLR = direction === 'LR';
  const mainShift = isLR ? shiftX : shiftY;
  const crossShift = isLR ? shiftY : shiftX;
  const shiftedLanePlacements = lanePlacements.map((p) => ({
    ...p,
    mainStart: p.mainStart + mainShift,
    mainEnd: p.mainEnd + mainShift,
    crossStart: p.crossStart + crossShift,
    crossEnd: p.crossEnd + crossShift,
  }));

  return {
    layoutedInnerNodes: shifted,
    innerEdges: shiftedInnerEdges,
    groupWidth: maxX - minX + padLeft + padRight,
    groupHeight: maxY - minY + padTop + padBottom,
    lanePlacements: shiftedLanePlacements,
  };
}

/**
 * @returns Positioned nodes and edges with absolute coordinates.
 * In compact mode (`options.compact === true`), inner nodes of compound groups
 * are excluded from the returned `nodes` array.
 * @throws If the input graph contains a cycle.
 */
export function dagLayout(
  nodes: readonly DagNode[],
  edges: readonly DagEdge[],
  compoundGroups: readonly DagCompoundGroup[] = [],
  options: DagLayoutOptions = {}
): {
  nodes: DagPositionedNode[];
  edges: DagPositionedEdge[];
  reservedLanePlacements: DagReservedLanePlacement[];
} {
  const direction = options.direction ?? 'TB';
  const compact = options.compact ?? false;
  const nodeSep = options.nodeSep ?? DEFAULT_NODE_SEP;
  const rankSep = options.rankSep ?? DEFAULT_RANK_SEP;
  const allReservedLanes = options.reservedLanes ?? [];
  const compoundPadding: Required<NonNullable<DagLayoutOptions['compoundPadding']>> = {
    ...DEFAULT_COMPOUND_PADDING,
    ...options.compoundPadding,
  };

  // Sort compound groups deepest-first (innermost first) so outer groups can
  // use the already-computed sizes of nested groups.
  const groupIds = new Set(compoundGroups.map((g) => g.id));
  const groupById = new Map(compoundGroups.map((g) => [g.id, g]));
  const visited = new Set<string>();
  const currentlyVisiting = new Set<string>();
  const sortedGroups: DagCompoundGroup[] = [];

  const visit = (group: DagCompoundGroup): void => {
    if (visited.has(group.id)) return;
    if (currentlyVisiting.has(group.id)) {
      throw new Error(`Compound group graph contains a cycle at node "${group.id}"`);
    }
    currentlyVisiting.add(group.id);
    for (const node of group.innerNodes) {
      if (groupIds.has(node.id)) {
        const child = groupById.get(node.id);
        if (child) visit(child);
      }
    }
    currentlyVisiting.delete(group.id);
    visited.add(group.id);
    sortedGroups.push(group);
  };
  for (const group of compoundGroups) visit(group);

  // Partition lanes by host graph: undefined → root graph, group.id → that group's body.
  // A lane belongs to a group if its ownerId appears in that group's innerNodes.
  const rootNodeIds = new Set(nodes.map((n) => n.id));
  const lanesByHostGraph = new Map<string | undefined, DagReservedLane[]>([[undefined, []]]);
  for (const group of compoundGroups) lanesByHostGraph.set(group.id, []);

  for (const lane of allReservedLanes) {
    // A lane whose ownerId is in the outer-graph node set belongs to the root.
    if (rootNodeIds.has(lane.ownerId)) {
      lanesByHostGraph.get(undefined)!.push(lane);
    } else {
      // Find the group whose innerNodes contain the ownerId.
      let found = false;
      for (const group of compoundGroups) {
        if (group.innerNodes.some((n) => n.id === lane.ownerId)) {
          lanesByHostGraph.get(group.id)!.push(lane);
          found = true;
          break;
        }
      }
      if (!found) {
        throw new Error(`reservedLane ownerId "${lane.ownerId}" not found in any graph node set`);
      }
    }
  }

  const groupSizing = new Map<string, { width: number; height: number }>();
  const groupInnerById = new Map<
    string,
    { layoutedInnerNodes: DagPositionedNode[]; innerEdges: DagPositionedEdge[] }
  >();
  // Store group lane placements keyed by group id — they are still in
  // padded-group-local space at this point (layoutCompoundGroup applied shiftX/shiftY
  // but not the group's outer absolute position, which isn't known until after the
  // outer layout runs). They are translated and pushed into allLanePlacements in the
  // finalisation loop below, alongside the inner-node absolute translation.
  const groupLanePlacementsById = new Map<string, DagReservedLanePlacement[]>();
  const allLanePlacements: DagReservedLanePlacement[] = [];

  // Index input nodes by id for O(1) lookups in the group-layout loop.
  const inputNodeById = new Map(nodes.map((n) => [n.id, n]));

  for (const group of sortedGroups) {
    if (compact) {
      // In compact mode use the caller-provided dimensions as-is and skip
      // inner layout. Inner nodes are not included in the output.
      const containerNode = inputNodeById.get(group.id);
      if (containerNode) {
        groupSizing.set(group.id, { width: containerNode.width, height: containerNode.height });
      }
      continue;
    }

    if (group.innerNodes.length === 0) {
      // No inner content — preserve the caller-provided container dimensions.
      groupInnerById.set(group.id, {
        layoutedInnerNodes: [],
        innerEdges: group.innerEdges.map((e) => ({ ...e, points: [] })),
      });
      continue;
    }

    // Replace any nested compound group placeholder with its computed size so
    // the parent's dagre layout reserves the correct bounding box.
    const sizedInnerNodes = group.innerNodes.map((n) => {
      const childSize = groupSizing.get(n.id);
      if (childSize) {
        return { ...n, width: childSize.width, height: childSize.height };
      }
      return n;
    });

    const groupLanes = lanesByHostGraph.get(group.id) ?? [];
    const r = layoutCompoundGroup(
      { ...group, innerNodes: sizedInnerNodes },
      direction,
      nodeSep,
      rankSep,
      compoundPadding,
      groupLanes
    );
    groupSizing.set(group.id, { width: r.groupWidth, height: r.groupHeight });
    groupInnerById.set(group.id, {
      layoutedInnerNodes: r.layoutedInnerNodes,
      innerEdges: r.innerEdges,
    });
    groupLanePlacementsById.set(group.id, r.lanePlacements);
  }

  // Run the outer graph layout, using computed sizes for compound nodes.
  const outerNodes = nodes.map((n) => {
    const sizing = groupSizing.get(n.id);
    if (sizing) {
      return { ...n, width: sizing.width, height: sizing.height };
    }
    return n;
  });

  const rootLanes = lanesByHostGraph.get(undefined) ?? [];
  const outerLayoutResult = layoutGraphWithLanes(
    outerNodes,
    edges,
    rootLanes,
    direction,
    nodeSep,
    rankSep
  );
  const outerLayout = { nodes: outerLayoutResult.nodes, edges: outerLayoutResult.edges };
  allLanePlacements.push(...outerLayoutResult.lanePlacements);

  // Index outer nodes by id once so lookups below are O(1) instead of O(n).
  const outerNodeById = new Map(outerLayout.nodes.map((n) => [n.id, n]));

  // Memoize absolute positions to avoid O(M²) re-computation for nested groups.
  const absPositionCache = new Map<string, { x: number; y: number }>();
  const getGroupAbsolutePosition = (groupId: string): { x: number; y: number } => {
    const cached = absPositionCache.get(groupId);
    if (cached) return cached;
    const outerNode = outerNodeById.get(groupId);
    if (outerNode) {
      const pos = { x: outerNode.x, y: outerNode.y };
      absPositionCache.set(groupId, pos);
      return pos;
    }
    for (const [parentGroupId, inner] of groupInnerById) {
      const childInParent = inner.layoutedInnerNodes.find((n) => n.id === groupId);
      if (childInParent) {
        const parentAbs = getGroupAbsolutePosition(parentGroupId);
        const pos = {
          x: parentAbs.x + childInParent.x,
          y: parentAbs.y + childInParent.y,
        };
        absPositionCache.set(groupId, pos);
        return pos;
      }
    }
    return { x: 0, y: 0 };
  };

  // Translate inner node positions from group-relative to absolute.
  const finalNodes: DagPositionedNode[] = [...outerLayout.nodes];
  const finalEdges: DagPositionedEdge[] = [...outerLayout.edges];

  const isLRLayout = direction === 'LR';
  for (const [groupId, inner] of groupInnerById) {
    const groupAbs = getGroupAbsolutePosition(groupId);
    finalNodes.push(
      ...inner.layoutedInnerNodes.map((n) => ({
        ...n,
        x: groupAbs.x + n.x,
        y: groupAbs.y + n.y,
      }))
    );
    finalEdges.push(
      ...inner.innerEdges.map((e) => ({
        ...e,
        points: translateEdgePoints(e.points, groupAbs.x, groupAbs.y),
      }))
    );
    // Translate group-local lane placements to root-absolute by adding the
    // group's outer absolute position (groupAbs is already root-absolute for
    // nested groups because getGroupAbsolutePosition recurses up the tree).
    const groupMainOffset = isLRLayout ? groupAbs.x : groupAbs.y;
    const groupCrossOffset = isLRLayout ? groupAbs.y : groupAbs.x;
    for (const p of groupLanePlacementsById.get(groupId) ?? []) {
      allLanePlacements.push({
        ...p,
        mainStart: p.mainStart + groupMainOffset,
        mainEnd: p.mainEnd + groupMainOffset,
        crossStart: p.crossStart + groupCrossOffset,
        crossEnd: p.crossEnd + groupCrossOffset,
      });
    }
  }

  return { nodes: finalNodes, edges: finalEdges, reservedLanePlacements: allLanePlacements };
}
