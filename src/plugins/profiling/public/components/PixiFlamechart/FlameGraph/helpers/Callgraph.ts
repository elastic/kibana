export interface NodeID<T> {
  ID: T
}

export interface Node<T> extends NodeID<T> {
  Count: number
  LeafCount: number
}

export interface Edge<T> {
  SrcID: T
  DstID: T
  Count: number
}

// CallGraph provides a traversable graph.
// <T> is the type of the node identifiers.
export class CallGraph<T> {
  // The list of nodes in a CallGraph instance.
  nodes = new Map<T, Node<T>>()

  // A list of outgoing edges for a given node.
  outgoing = new Map<T, Edge<T>[]>()

  // A list of incoming edges for a given node.
  incoming = new Map<T, Edge<T>[]>()

  // Keep track of the number of edges to avoid costs in GetEdgeCount().
  numEdges = 0

  constructor()
  constructor(nodes: Node<T>[], edges: Edge<T>[])
  constructor(nodes?: Node<T>[], edges?: Edge<T>[]) {
    if (nodes !== undefined) {
      for (let node of nodes) {
        this.AddNode(node)
      }
    }
    if (edges !== undefined) {
      for (let edge of edges) {
        this.AddEdge(edge)
      }
    }
  }

  // Clone the graph with shallow copies of nodes and edges.
  clone(): CallGraph<T> {
    let g = new CallGraph<T>()

    this.nodes.forEach((node: Node<T>) => {
      g.AddNode(node)

      let edges = this.outgoing.get(node.ID)
      if (edges !== undefined) {
        edges.forEach((edge: Edge<T>) => {
          g.AddEdge(edge)
        })
      }
    })

    return g
  }

  // AddNode inserts a node into the callgraph.
  // If a node with the same ID already exists, it will be replaced.
  // Replacing does not clean up the data structures.
  // If that is a problem, check with GetNode() before calling AddNode().
  AddNode(node: Node<T>) {
    this.nodes.set(node.ID, node)
  }

  RemoveNode(node: Node<T>) {
    let edges: Edge<T>[] | undefined

    // Remove node's outgoing edges.
    edges = this.outgoing.get(node.ID)
    if (edges !== undefined) {
      // Remove edges beginning at the end of the array, else
      // we may skip entries as as RemoveEdge() modifies the array itself.
      for (let idx = edges.length - 1; idx >= 0; idx--) {
        this.RemoveEdge(edges[idx])
      }
    }

    // Remove node's incoming edges.
    edges = this.incoming.get(node.ID)
    if (edges !== undefined) {
      // Remove edges beginning at the end of the array, else
      // we may skip entries as as RemoveEdge() modifies the array itself.
      for (let idx = edges.length - 1; idx >= 0; idx--) {
        this.RemoveEdge(edges[idx])
      }
    }

    // Remove node from the data structures.
    this.outgoing.delete(node.ID)
    this.incoming.delete(node.ID)
    this.nodes.delete(node.ID)
  }

  private addEdge(edgeMap: Map<T, Edge<T>[]>, nodeID: T, edge: Edge<T>) {
    let edges = edgeMap.get(nodeID)!
    if (edges == null) {
      edges = []
      edgeMap.set(nodeID, edges)
      edges = edgeMap.get(nodeID)!
    }
    edges.push(edge)
  }

  // AddEdge inserts an edge into the callgraph.
  AddEdge(edge: Edge<T>): void {
    // Create outgoing edge for the caller.
    this.addEdge(this.outgoing, edge.SrcID, edge)

    // Create incoming edge for the callee.
    this.addEdge(this.incoming, edge.DstID, edge)

    this.numEdges++
  }

  // RemoveEdge removes an edge from the callgraph.
  RemoveEdge(edge: Edge<T>): void {
    const srcID = edge.SrcID
    const dstID = edge.DstID

    // Remove 'edge' from the given array of edges.
    const removeEdge = (edges: Edge<T>[] | undefined) => {
      if (edges === undefined) {
        return 0;
      }
      let num = 0
      for (let idx = edges.length - 1; idx >= 0; idx--) {
        let e = edges[idx]
        if (e.SrcID === srcID && e.DstID === dstID) {
          edges[idx] = edges[edges.length - 1]
          edges.pop()
          num++
        }
      }
      return num
    }

    // Each edge exists 2x in the graph data structures, but we only count it as one.
    this.numEdges -= removeEdge(this.outgoing.get(srcID))
    removeEdge(this.incoming.get(dstID))
  }

  // GetNodeCount returns the number of nodes stored in the graph.
  GetNodeCount(): number {
    return this.nodes.size
  }

  // GetEdgeCount returns the number of edges stored in the graph.
  GetEdgeCount(): number {
    return this.numEdges
  }

  // GetNode returns the node with a given ID or undefined if it doesn't exist.
  GetNode(nodeID: T): Node<T> | undefined {
    return this.nodes.get(nodeID)
  }

  // GetEdge returns the edge with the given src/dst ID or undefined if it doesn't exist.
  GetEdge(srcID: T, dstID: T): Edge<T> | undefined {
    const edges = this.outgoing.get(srcID)

    if (edges !== undefined) {
      for (let edge of edges) {
        if (edge.SrcID === srcID && edge.DstID === dstID) {
          return edge
        }
      }
    }

    return undefined
  }

  private iterateEdges(edges: Edge<T>[] | undefined, fn: (edge: Edge<T>) => void) {
    if (edges !== undefined) {
      for (let edge of edges) {
        fn(edge)
      }
    }
  }

  IterateOutgoingEdges(node: Node<T>, fn: (edge: Edge<T>) => void) {
    this.iterateEdges(this.outgoing.get(node.ID), fn)
  }

  IterateIncomingEdges(node: Node<T>, fn: (edge: Edge<T>) => void) {
    this.iterateEdges(this.incoming.get(node.ID), fn)
  }

  private getNodesFromEdges(
    root: Node<T>,
    edges: Edge<T>[] | undefined,
    compareFn?: (n1: Node<T>, n2: Node<T>) => number) {
    if (edges === undefined) {
      return []
    }

    let nodes = new Map<Node<T>, boolean>()

    // Create a set of parent nodes.
    for (let edge of edges) {
      nodes.set(this.nodes.get(edge.SrcID)!, true)
      nodes.set(this.nodes.get(edge.DstID)!, true)
    }

    // Remove the root node from the set.
    nodes.delete(root)

    let nodes_array = Array.from(nodes.keys())

    if (compareFn !== undefined) {
      nodes_array.sort(compareFn)
    }

    return nodes_array
  }

  GetParentNodes(node: Node<T>, compareFn?: (n1: Node<T>, n2: Node<T>) => number) {
    return this.getNodesFromEdges(node, this.incoming.get(node.ID), compareFn)
  }

  GetChildNodes(node: Node<T>, compareFn?: (n1: Node<T>, n2: Node<T>) => number) {
    return this.getNodesFromEdges(node, this.outgoing.get(node.ID), compareFn)
  }

  // IterateBFS is a breadth first search through the callgraph nodes,
  // starting at 'root'.
  // The function 'fn' is called for each node incl. the 'root' node.
  // 'maxCalleeLevel' is the max depth to iterate 'down', e.g. 1 means 'direct neighboring callees'.
  // 'maxCallerLevel' is the max depth to iterate 'up', e.g. 1 means 'direct neighboring callers'.
  IterateBFS(root: Node<T>, fn: Function, maxCalleeLevel: number, maxCallerLevel: number) {
    let visited = new Map<NodeID<T>, boolean>()
    let queue: Array<any> = []

    const enqueue = (edges: Edge<T>[] | undefined, level: number): void => {
      if (edges === undefined) {
        return
      }
      for (let edge of edges) {
        if (!visited.get(this.nodes.get(edge.SrcID)!)) {
          queue.push({ nodeID: edge.SrcID, level: level })
        }
        if (!visited.get(this.nodes.get(edge.DstID)!)) {
          queue.push({ nodeID: edge.DstID, level: level })
        }
      }
    }

    let current = { nodeID: root.ID, level: 0 }

    for (; ;) {
      let node: Node<T> = this.nodes.get(current.nodeID)!
      let level: number = current.level

      fn(node, level)
      visited.set(node, true)

      if (level < maxCalleeLevel) {
        enqueue(this.outgoing.get(node.ID), level + 1)
      }
      if (level < maxCallerLevel) {
        enqueue(this.incoming.get(node.ID), level + 1)
      }

      if (queue.length === 0) {
        break
      }

      // Dequeue the next node to visit.
      current = queue.shift()
    }
  }

  // SubGraph creates a subgraph with central node 'root' and
  // with the given depth in direction of callees and callers.
  // 'maxCalleeLevel' is the max depth 'down', e.g. 1 means 'direct neighboring callees'.
  // 'maxCallerLevel' is the max depth 'up', e.g. 1 means 'direct neighboring callers'.
  SubGraph(root: Node<T>, maxCalleeLevel: number, maxCallerLevel: number) {
    let subgraph: CallGraph<T> = new CallGraph()

    // Collect all nodes up to the max levels.
    const nodeIterator = (node: Node<T>, level: number): void => {
      subgraph.AddNode(node)
    }
    this.IterateBFS(root, nodeIterator, maxCalleeLevel, 0)
    this.IterateBFS(root, nodeIterator, 0, maxCallerLevel)

    // Add all edges that connect any nodes of the sub graph.
    this.nodes.forEach((node: Node<T>) => {
      let edges = this.outgoing.get(node.ID)
      if (edges === undefined) {
        return
      }
      edges.forEach((edge: Edge<T>) => {
        if (subgraph.nodes.get(edge.SrcID) !== undefined && subgraph.nodes.get(edge.DstID) !== undefined) {
          subgraph.AddEdge(edge)
        }
      })
    })

    return subgraph
  }
}
