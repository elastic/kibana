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
