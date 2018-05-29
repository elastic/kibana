/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * A topological ordering is possible if and only if the graph has no directed
 * cycles, that is, if it is a directed acyclic graph (DAG). If the input cannot
 * be ordered an error is thrown.
 *
 * Uses Kahn's Algorithm to sort the graph.
 *
 * @param graph A directed acyclic graph with vertices as keys and outgoing
 * edges as values.
 */
export function topologicalSort<T>(graph: Map<T, T[]>) {
  const sorted = new Set<T>();

  // if (graph.size === 0) {
  //   return sorted;
  // }

  // We clone the graph so we can remove handled nodes while we perform the
  // topological ordering. If the cloned graph is _not_ empty at the end, we
  // know we were not able to topologically order the graph.
  const clonedGraph = new Map(graph.entries());

  // First, find a list of "start nodes" which have no outgoing edges. At least
  // one such node must exist in a non-empty acyclic graph.
  const nodesWithNoEdges = [...clonedGraph.keys()].filter(name => {
    const edges = clonedGraph.get(name) as T[];
    return edges.length === 0;
  });

  while (nodesWithNoEdges.length > 0) {
    const processingNode = nodesWithNoEdges.pop() as T;

    // We know this node has no edges, so we can remove it
    clonedGraph.delete(processingNode);

    sorted.add(processingNode);

    // Go through all nodes and remove all edges into `node`
    [...clonedGraph.keys()].forEach(node => {
      const edges = clonedGraph.get(node) as T[];
      const newEdges = edges.filter(edge => edge !== processingNode);

      clonedGraph.set(node, newEdges);

      if (newEdges.length === 0) {
        nodesWithNoEdges.push(node);
      }
    });
  }

  if (clonedGraph.size > 0) {
    const edgesLeft = JSON.stringify([...clonedGraph.entries()]);
    throw new Error(
      `Topological ordering did not complete, these edges could not be ordered: ${edgesLeft}`
    );
  }

  return sorted;
}
