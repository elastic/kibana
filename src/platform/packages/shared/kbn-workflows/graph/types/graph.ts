/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { graphlib } from '@dagrejs/dagre';
import type { GraphNodeUnion } from './nodes/union';

// graphlib v4's `Graph<GraphLabel, NodeLabel, EdgeLabel>` takes the node label as its
// SECOND generic (the first is the graph label). `GraphNodeUnion` must go in the second
// slot so `graph.node()` stays typed; a single-generic form silently returns `any`.
export type WorkflowGraphType = graphlib.Graph<unknown, GraphNodeUnion>;

/**
 * Wire format for a persisted execution graph.
 *
 * This is a persisted format: a branch child execution stores the graph it was
 * handed and keeps running it even if the workflow definition is edited
 * mid-run. It lives next to {@link GraphNodeUnion} so a change to the node types
 * is visibly a change to what is already on disk.
 */
export interface SerializedWorkflowGraph {
  nodes: GraphNodeUnion[];
  edges: Array<{ v: string; w: string }>;
}
