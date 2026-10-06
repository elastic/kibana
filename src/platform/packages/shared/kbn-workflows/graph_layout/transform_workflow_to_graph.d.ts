/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  FallbackLane,
  ForeachGroup,
  GraphEdge,
  NodeRef,
  PreLayoutBypassLaneNode,
  PreLayoutNode,
} from './types';
import type { WorkflowYaml } from '../spec/schema';
export interface TransformResult {
  nodes: PreLayoutNode[];
  edges: GraphEdge[];
  foreachGroups: ForeachGroup[];
  /**
   * Layout-only bypass lane nodes for unbalanced `if`/`switch` branches.
   * Separate from domain `nodes` — callers pass these to the layout engine but
   * must not render them as workflow steps or include them in `nodeRefs`.
   */
  bypassLaneNodes: PreLayoutBypassLaneNode[];
  /**
   * Maps every node id to its source in the workflow definition.
   * The transform is the single place that mints node ids (via `IdAllocator`),
   * so it is the authoritative owner of this mapping — callers must not
   * reconstruct it by reading `node.data`.
   */
  nodeRefs: Record<string, NodeRef>;
  /**
   * One entry per `on-failure.fallback` lane in the graph. The renderer uses
   * this to build owner/head/leaf sets for execution highlighting and to widen
   * the `mergeNodeIds` predicate so shape-2 rejoin edges route correctly.
   */
  fallbackLanes: FallbackLane[];
}
/**
 * Transforms the parsed `WorkflowYaml` into a flat list of pre-layout nodes
 * and edges plus an optional list of `foreachGroup` containers (top-level
 * foreach steps render their body inside a visual container).
 *
 * Pure: same input → same output. Safe to memoize on the topology fingerprint.
 */
export declare function transformWorkflowToGraph(
  workflow: WorkflowYaml | undefined
): TransformResult;
