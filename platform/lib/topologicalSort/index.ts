// Implementation of Kahn's Algorithm

export function topologicalSort<T>(graph: Map<T, T[]>) {
  // We clone the graph so we can mutate it while we perform the topological
  // ordering. If the cloned graph is _not_ empty at the end, we know we were
  // not able to topologically order the graph.
  const clonedGraph = new Map(graph.entries());
  const sorted = new Set<T>();

  let noEdges = [...clonedGraph.keys()]
    .filter(name => {
      const edges = clonedGraph.get(name) as T[];
      return edges.length === 0;
    });

  while (noEdges.length > 0) {
    const nodeName = noEdges.pop() as T;
    // We know this node has no edges, so we can remove it
    clonedGraph.delete(nodeName);

    sorted.add(nodeName);

    // Go through all nodes and remove all vertices into `nodeName`
    [...clonedGraph.keys()].forEach(node => {
      const edges = clonedGraph.get(node) as T[];
      const newEdges = edges.filter(vertex => vertex !== nodeName);

      clonedGraph.set(node, newEdges);

      if (newEdges.length === 0) {
        noEdges.push(node);
      }
    });
  }

  if (clonedGraph.size > 0) {
    const edgesLeft = JSON.stringify([...clonedGraph.entries()]);
    throw new Error(`Topological ordering did not complete, these edges could not be ordered: ${edgesLeft}`);
  }

  return sorted;
}
