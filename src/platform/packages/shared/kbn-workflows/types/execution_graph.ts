/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface ExecutionGraphNode {
  /** Unique identifier for the node */
  id: string;
  /** Topological index of the node in the graph */
  topologicalIndex: number;
  /** Type of the node */
  type: string;
  /** Previous nodes in the graph (parents for the current node)*/
  prev: string[];
  /** Next nodes in the graph (children for the current node) */
  next: string[];
  /** Additional metadata about the node, such as configuration */
  data: any; // rename to metadata
}

export interface ExecutionGraph {
  /** Dictionary of all nodes in the graph */
  nodes: Record<string, ExecutionGraphNode>;
  /** Topologically ordered node IDs. Determines the execution order of the nodes. */
  topologicalOrder: string[];
}
