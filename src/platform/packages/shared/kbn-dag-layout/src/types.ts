/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Minimal node descriptor required by the layout engine. */
export interface DagNode {
  readonly id: string;
  readonly width: number;
  readonly height: number;
}

export interface DagEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
}

/**
 * A nested independent subgraph rendered inside compound node `id`.
 * Compound nodes never share edges with their parent graph — layout
 * is always independent.
 */
export interface DagCompoundGroup {
  readonly id: string;
  readonly innerNodes: readonly DagNode[];
  readonly innerEdges: readonly DagEdge[];
}

/** Positioned node with absolute coordinates. */
export interface DagPositionedNode {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /**
   * True when the node was placed in a reserved side lane. Cross-axis
   * position-mutating passes (e.g. `separatePositionedOverlapsInPlace`)
   * must treat these nodes as immovable so the lane's guaranteed clearance
   * from the spine is preserved. Absent for spine nodes.
   */
  readonly crossPinned?: boolean;
}

export interface DagPositionedEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  /** Dagre waypoints (absolute). Empty = render straight line. */
  readonly points: ReadonlyArray<{ readonly x: number; readonly y: number }>;
}

export type DagLayoutDirection = 'TB' | 'LR';

/**
 * A node set placed as a reserved side lane in the +cross margin instead of
 * by dagre. The owner's main-axis band is kept clear on the spine, the lane
 * head is levelled with the owner, and the lane sits nodeSep past the spine's
 * cross extent within that band. Lane sets must be pairwise disjoint.
 */
export interface DagReservedLane {
  /** Node ids forming this lane. Must all be present in the input node array. */
  readonly nodeIds: readonly string[];
  /**
   * Nesting depth. Orders placement and guarantees a lane is further out than
   * the lane containing its owner. NOT a global column index — two lanes at
   * the same depth can have different inner edges (local hugging, D5).
   */
  readonly depth: number;
  /** The spine node this lane's head is levelled with on the main axis. */
  readonly ownerId: string;
}

/**
 * Placed geometry of one reserved lane, returned by `dagLayout` so callers
 * can re-hug a lane after a post-dagre packing pass that widens the spine.
 */
export interface DagReservedLanePlacement {
  readonly ownerId: string;
  readonly crossStart: number;
  readonly crossEnd: number;
  readonly mainStart: number;
  readonly mainEnd: number;
}

export interface DagLayoutOptions {
  /** Default 'TB'. */
  direction?: DagLayoutDirection;
  /**
   * Cross-axis spacing between nodes (dagre nodeSep).
   * @kbn/workflows-ui defines DEFAULT_NODE_SEP / COMPACT_NODE_SEP constants.
   */
  nodeSep?: number;
  /** Main-axis spacing between ranks (dagre rankSep). */
  rankSep?: number;
  /**
   * Compact mode: skip inner-subgraph layout entirely.
   * Compound nodes use the caller-provided width/height as-is.
   * Inner nodes are not included in the output.
   * Intended for minimap / preview contexts.
   *
   * @remarks In compact mode, inner nodes of compound groups are excluded
   * from the returned `nodes` array. Callers must not assume output nodes
   * are a 1:1 match with input nodes when compact is true.
   */
  compact?: boolean;
  /** Padding around inner content of a compound node. Defaults to all zeros. */
  compoundPadding?: Partial<{ top: number; right: number; bottom: number; left: number }>;
  /**
   * Node sets to place in the +cross margin as reserved side lanes, instead of
   * through dagre. Lane nodes are excluded from the spine dagre run; their
   * heads are levelled with their owners; the spine below each owner is pushed
   * to clear the lane's full main extent.
   *
   * Each lane's node ids must be present in the input `nodes` array of the
   * graph that hosts the lane (`ownerId`'s graph). Lane sets must be pairwise
   * disjoint. Defaults to empty (no reserved lanes).
   */
  reservedLanes?: readonly DagReservedLane[];
}
