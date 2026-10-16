/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_COMPOUND_PADDING, DEFAULT_NODE_SEP, DEFAULT_RANK_SEP } from './constants';
import { layoutGraphWithLanes } from './layout_graph_with_lanes';
import { translatePlacement } from './translate_placement';
import type {
  DagCompoundGroup,
  DagEdge,
  DagLayoutOptions,
  DagNode,
  DagPositionedNode,
  DagReservedLane,
  DagReservedLanePlacement,
} from './types';

interface CompoundGroupLayout {
  layoutedInnerNodes: DagPositionedNode[];
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

  const { nodes: innerLayouted, lanePlacements } = layoutGraphWithLanes(
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

  // Apply the same (shiftX, shiftY) that repositions inner nodes to lane
  // placements, so they stay in the same padded-group-local coordinate space.
  // dagLayout will later translate them further to root-absolute when finalising
  // inner nodes (adding the group's outer absolute position).
  const isLR = direction === 'LR';
  const shiftedLanePlacements = lanePlacements.map((p) =>
    translatePlacement(p, shiftX, shiftY, isLR)
  );

  return {
    layoutedInnerNodes: shifted,
    groupWidth: maxX - minX + padLeft + padRight,
    groupHeight: maxY - minY + padTop + padBottom,
    lanePlacements: shiftedLanePlacements,
  };
}

/**
 * @returns Positioned nodes with absolute coordinates, and the placed geometry of each
 * reserved lane.
 * In compact mode (`options.compact === true`), inner nodes of compound groups
 * are excluded from the returned `nodes` array.
 * @throws If the compound group nesting or the node graph contains a cycle, a lane
 * set is malformed, or a compound group is not placed in the root graph or another group.
 */
export function dagLayout(
  nodes: readonly DagNode[],
  edges: readonly DagEdge[],
  compoundGroups: readonly DagCompoundGroup[] = [],
  options: DagLayoutOptions = {}
): {
  nodes: DagPositionedNode[];
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
  const groupInnerById = new Map<string, { layoutedInnerNodes: DagPositionedNode[] }>();
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
      groupInnerById.set(group.id, { layoutedInnerNodes: [] });
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
    groupInnerById.set(group.id, { layoutedInnerNodes: r.layoutedInnerNodes });
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
  const outerLayout = layoutGraphWithLanes(
    outerNodes,
    edges,
    rootLanes,
    direction,
    nodeSep,
    rankSep
  );
  allLanePlacements.push(...outerLayout.lanePlacements);

  // Index outer nodes by id once so lookups below are O(1) instead of O(n).
  const outerNodeById = new Map(outerLayout.nodes.map((n) => [n.id, n]));

  // Each nested group's placement inside its parent group, indexed once. A group
  // that is neither a root node nor placed inside another group has no position.
  const parentPlacementByGroupId = new Map<
    string,
    { parentGroupId: string; placement: DagPositionedNode }
  >();
  for (const [parentGroupId, inner] of groupInnerById) {
    for (const placement of inner.layoutedInnerNodes) {
      if (groupIds.has(placement.id) && !parentPlacementByGroupId.has(placement.id)) {
        parentPlacementByGroupId.set(placement.id, { parentGroupId, placement });
      }
    }
  }

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
    const parentPlacement = parentPlacementByGroupId.get(groupId);
    if (!parentPlacement) {
      throw new Error(
        `Compound group "${groupId}" is neither a root node nor inside another group`
      );
    }
    const { parentGroupId, placement } = parentPlacement;
    const parentAbs = getGroupAbsolutePosition(parentGroupId);
    const pos = { x: parentAbs.x + placement.x, y: parentAbs.y + placement.y };
    absPositionCache.set(groupId, pos);
    return pos;
  };

  // Translate inner node positions from group-relative to absolute.
  const finalNodes: DagPositionedNode[] = [...outerLayout.nodes];

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
    // Translate group-local lane placements to root-absolute by adding the
    // group's outer absolute position (groupAbs is already root-absolute for
    // nested groups because getGroupAbsolutePosition recurses up the tree).
    for (const p of groupLanePlacementsById.get(groupId) ?? []) {
      allLanePlacements.push(translatePlacement(p, groupAbs.x, groupAbs.y, isLRLayout));
    }
  }

  return { nodes: finalNodes, reservedLanePlacements: allLanePlacements };
}
