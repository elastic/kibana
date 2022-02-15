import dagre from 'dagre'
import { Node, Edge, CallGraph } from './Callgraph'

export interface Dimension {
  width: number
  height: number
}

interface Rectangle {
  x: number
  y: number
  height: number
  width: number
}

interface BackendNode<T> extends Node<T> {
  ExeFileName: string
  FunctionID: string
  FunctionName: string
  FunctionSourceID: string
  FunctionSourceLine: number
  FunctionSourceURL: string
  SourceLine: number
  SourceFilename: string
  FrameType: number
  AdressOrLine: number
  FileID: string

  // Inclusive CPU usage in the range [0..1] (Count / TotalCount)
  InclusiveCPU: number
  // Exclusive CPU usage in the range [0..1] (LeafCount / TotalCount)
  ExclusiveCPU: number

  // Number of nodes represented by a cluster node
  FoldedNodeCount: number
}

export interface DrawableNode<T> extends BackendNode<T> {
  Rectangle: Rectangle
}

interface BackendEdge<T> extends Edge<T> {
  // CPU usage "flow" in the range 0.. (Count / TotalCount)
  // For circular/recursive stack traces, the edge's Count value can be
  // N times the trace Count value. So this value can be > 1.
  CPUFlow: number
}

export interface DrawableEdge<T> extends BackendEdge<T> {
  Points: { x: number; y: number }[]
}

interface BackendCallgraph {
  Nodes: BackendNode<number>[]
  Edges: BackendEdge<number>[]

  TotalCount?: number
  TotalTraces?: number
  TotalSeconds?: number
}

/**
 * Callcharts can be fairly large, contain many components that are not necessarily visible at a
 * given zoom level. The CallchartDataContainer manages access to the rectangles for the chart,
 * allowing the easy querying of "which elements are visible at my current zoom level".
 */
export class CallchartDataContainer {
  private maxX = 0 // The maximum X coordinate calculated by the layout engine.
  private maxY = 0 // The maximum Y coordinate calculated by the layout engine.

  private totalCount: number // The total number of counts in the graph.
  private totalSeconds: number // The total number of seconds covered by the time period.
  // The traversable graph, needed to create subgraphs and differential graphs.
  private graph: CallGraph<number>
  private subgraph: CallGraph<number>

  // The graph layout engine for a directed graph.
  private graphengine = new dagre.graphlib.Graph()

  constructor(inputdata: BackendCallgraph) {
    this.totalCount = inputdata.TotalCount!
    this.totalSeconds = inputdata.TotalSeconds!
    // Create a CallGraph instance from the backend's callgraph data.
    this.graph = new CallGraph<number>(inputdata.Nodes, inputdata.Edges)
    this.subgraph = this.graph

    // Calculate metadata for visualization.
    this.graph.nodes.forEach((node: Node<number>) => {
      this.calculateNodeMetadata(node as BackendNode<number>)

      this.graph.IterateOutgoingEdges(node, edge => {
        this.calculateEdgeMetadata(edge as BackendEdge<number>)
      })
    })
  }

  // Callback to get the node dimensions from the visualization code.
  private nodeDimensionProvider = (node: DrawableNode<number>): Dimension => {
    return { width: 0, height: 0 }
  }

  // Create a node label from a node.
  private static getNodeLabel(node: BackendNode<any>): string {
    if (node.ID < 0) {
      return node.ID.toString()
    }

    let label: string

    if (node.SourceFilename !== '' && node.FunctionName !== '') {
      label = node.SourceFilename + node.FunctionName
    } else {
      label = node.FunctionSourceID + '/' + node.FunctionName
    }

    return label
  }

  // Set a node in dagre Graph.
  private setNode(node: BackendNode<number>): string {
    let label: string = CallchartDataContainer.getNodeLabel(node)

    // The visualizer calculates the needed dimension for each node.
    const dim = this.nodeDimensionProvider(node as DrawableNode<number>)

    let name: string = node.ID.toString()
    this.graphengine.setNode(name, {
      label: label,
      width: dim.width,
      height: dim.height,
    })

    return name
  }

  // Copy the backend graph into 'dagre'.
  private constructGraph(graph: CallGraph<number>) {
    graph.nodes.forEach((node: Node<number>) => {
      const backendNode = node as BackendNode<number>
      this.setNode(backendNode)

      graph.IterateOutgoingEdges(backendNode, edge => {
        this.graphengine.setEdge(edge.SrcID.toString(), edge.DstID.toString())
      })
    })
  }

  // Return the cumulated count for outgoing edges of the given node.
  private getOutgoingCount(node: Node<number>) {
    let count = 0
    this.graph.IterateOutgoingEdges(node, edge => {
      count += edge.Count
    })
    return count
  }

  // Return the cumulated count for incoming edges of the given node.
  private getIncomingCount(node: Node<number>) {
    let count = 0
    this.graph.IterateIncomingEdges(node, edge => {
      count += edge.Count
    })
    return count
  }

  private calculateNodeMetadata(node: BackendNode<number>) {
    node.InclusiveCPU = node.Count / this.totalCount

    // This can be removed after the next deploy of the web service (likely after 5.5.2021)
    if (node.LeafCount === undefined) {
      node.LeafCount = node.Count - this.getOutgoingCount(node)
    }

    node.ExclusiveCPU = node.LeafCount / this.totalCount
  }

  private calculateEdgeMetadata(edge: BackendEdge<number>) {
    // The CPUFlow is the relative edge.Count value.
    edge.CPUFlow = edge.Count / this.totalCount
  }

  // Set the callback that returns the size for a given node.
  public setNodeDimensionProvider(
    provider: (node: DrawableNode<number>) => Dimension
  ) {
    this.nodeDimensionProvider = provider
  }

  // Return the node with the highest CPU consumption.
  public getTopNode(): DrawableNode<number> | undefined {
    let maxLeafCount = 0
    let retNode = undefined

    this.graph.nodes.forEach((n: Node<number>) => {
      let node = n as BackendNode<number>

      if (maxLeafCount < node.LeafCount) {
        maxLeafCount = node.LeafCount
        retNode = node
      }
    })

    return retNode
  }

  // Return the node identified by sourceId and sourceLine (or undefined if not found).
  public getNodeBySource(
    exeFileName: string,
    sourceFilename: string,
    functionName: string,
    fileID: string,
    addressOrLine: number | string
  ): DrawableNode<number> | undefined {
    let retNode = undefined

    this.graph.nodes.forEach((n: Node<number>) => {
      let node = n as BackendNode<number>

      /**
       * Depending on the having certain parameters as `empty strings`, we'll want to draw
       * different comparisons to get the correct `node`
       * Please refer to `FuntionLink / index.tsx / callgraphLink` to see how we're building the deeplink
       * and check https://github.com/optimyze/prodfiler_ui/pull/501 for further discussions
       */
      if (functionName !== '') {
        if (sourceFilename !== '') {
          // fully symbolized frame
          if (
            exeFileName === node.ExeFileName &&
            sourceFilename === node.SourceFilename &&
            functionName === node.FunctionName
          ) {
            retNode = node
          }
        } else {
          // ELF-symbolized frame
          if (exeFileName === node.ExeFileName && fileID === node.FileID) {
            retNode = node
          }
        }
      } else {
        // unsymbolized frame
        if (fileID === node.FileID && addressOrLine === node.AdressOrLine) {
          retNode = node
        }
      }
    })

    return retNode
  }

  private compareEdgeByCount = (e1: Edge<number>, e2: Edge<number>) => {
    return e2.Count - e1.Count
  }

  // Add the top "CPU flow" parent of node to the graph.
  private addSignificantParentByEdge(
    graph: CallGraph<number>,
    node: Node<number>
  ) {
    // Get incoming edges sorted by Count (descending).
    let edges = this.graph.incoming.get(node.ID)

    if (edges !== undefined) {
      for (let e of edges.sort(this.compareEdgeByCount)) {
        let n = this.graph.GetNode(e.SrcID)!
        if (graph.GetNode(n.ID) === undefined) {
          graph.AddNode(n)
          return n
        }
      }
    }
  }

  // Add the top "CPU flow" parent of node to the graph.
  private addSignificantChildByEdge(
    graph: CallGraph<number>,
    node: Node<number>
  ) {
    // Get outgoing edges sorted by Count (descending).
    let edges = this.graph.outgoing.get(node.ID)

    if (edges !== undefined) {
      for (let e of edges.sort(this.compareEdgeByCount)) {
        let n = this.graph.GetNode(e.DstID)!
        if (graph.GetNode(n.ID) === undefined) {
          graph.AddNode(n)
          return n
        }
      }
    }
  }

  // Add the edges of a node from the main graph into graph, as far as
  // the connected nodes are present in graph.
  private addEdgesForNode(graph: CallGraph<number>, node: Node<number>) {
    let nodesToAmend = new Map<Node<number>, boolean>()

    this.graph.IterateOutgoingEdges(node, edge => {
      if (graph.GetEdge(edge.SrcID, edge.DstID) !== undefined) {
        return
      }
      let dstNode = graph.nodes.get(edge.DstID)
      if (dstNode !== undefined && graph.nodes.get(edge.SrcID) !== undefined) {
        graph.AddEdge(edge)
        nodesToAmend.set(dstNode, true)
      }
    })

    this.graph.IterateIncomingEdges(node, edge => {
      if (graph.GetEdge(edge.SrcID, edge.DstID) !== undefined) {
        return
      }
      let srcNode = graph.nodes.get(edge.SrcID)
      if (srcNode !== undefined && graph.nodes.get(edge.DstID) !== undefined) {
        graph.AddEdge(edge)
        nodesToAmend.set(srcNode, true)
      }
    })

    nodesToAmend.delete(node)

    // Rebuild the virtual nodes that have changed.
    nodesToAmend.forEach((v, node) => {
      if (this.removeVirtualParent(graph, node)) {
        this.addVirtualParent(graph, node)
      }
      if (this.removeVirtualChild(graph, node)) {
        this.addVirtualChild(graph, node)
      }
    })
  }

  // Remove the node's connected virtual child node.
  private removeVirtualParent(graph: CallGraph<number>, node: Node<number>) {
    let removed = false

    this.graph.IterateIncomingEdges(node, edge => {
      if (edge.SrcID < 0) {
        let srcNode = graph.nodes.get(edge.SrcID)!
        graph.RemoveNode(srcNode)
        removed = true
      }
    })

    return removed
  }

  // Remove the node's connected virtual parent node.
  private removeVirtualChild(graph: CallGraph<number>, node: Node<number>) {
    let removed = false

    this.graph.IterateOutgoingEdges(node, edge => {
      if (edge.DstID < 0) {
        let dstNode = graph.nodes.get(edge.DstID)!
        graph.RemoveNode(dstNode)
        removed = true
      }
    })

    return removed
  }

  private getFoldedNodeCount(graph: CallGraph<number>, nodes: Node<number>[]) {
    let foldedNodeCount = 0

    for (let n of nodes) {
      if (graph.GetNode(n.ID) === undefined) {
        foldedNodeCount++
      }
    }

    return foldedNodeCount
  }

  // Unique virtual node ID counter
  private vID = 0

  private addVirtualParent(graph: CallGraph<number>, node: Node<number>) {
    const nodes = this.graph.GetParentNodes(node)
    const foldedNodeCount = this.getFoldedNodeCount(graph, nodes)

    if (foldedNodeCount === 0) {
      return
    }

    const vnode = {
      ID: --this.vID,
      Count: 0,
      LeafCount: 0,
      Rectangle: {},
      FoldedNodeCount: foldedNodeCount,
    } as DrawableNode<number>

    this.graph.IterateIncomingEdges(node, edge => {
      if (
        graph.GetNode(edge.SrcID) === undefined &&
        edge.SrcID !== edge.DstID
      ) {
        vnode.Count += edge.Count
      }
    })

    this.calculateNodeMetadata(vnode)
    graph.AddNode(vnode)

    // Create egde from virtual node to current node.
    let vedge = {
      SrcID: vnode.ID,
      DstID: node.ID,
      Count: vnode.Count,
      Points: {},
    } as DrawableEdge<number>
    this.calculateEdgeMetadata(vedge)
    graph.AddEdge(vedge)
  }

  private addVirtualChild(graph: CallGraph<number>, node: Node<number>) {
    const nodes = this.graph.GetChildNodes(node)
    const foldedNodeCount = this.getFoldedNodeCount(graph, nodes)

    if (foldedNodeCount === 0) {
      return
    }

    const vnode = {
      ID: --this.vID,
      Count: 0,
      LeafCount: 0,
      Rectangle: {},
      FoldedNodeCount: foldedNodeCount,
    } as DrawableNode<number>

    this.graph.IterateOutgoingEdges(node, edge => {
      if (
        graph.GetNode(edge.DstID) === undefined &&
        edge.SrcID !== edge.DstID
      ) {
        vnode.Count += edge.Count
      }
    })

    this.calculateNodeMetadata(vnode)
    graph.AddNode(vnode)

    // Create egde from virtual node to current node.
    let vedge = {
      SrcID: node.ID,
      DstID: vnode.ID,
      Count: vnode.Count,
      Points: {},
    } as DrawableEdge<number>
    this.calculateEdgeMetadata(vedge)
    graph.AddEdge(vedge)
  }

  // Create a subgraph with 'root' as central/selected node and "folded" nodes.
  // The initial size is set via maxCalleeLevel (max depth of child nodes) and
  // by maxCallerLevel (max depth of parent nodes).
  private subGraph(
    root: DrawableNode<number>,
    maxCalleeLevel: number,
    maxCallerLevel: number
  ) {
    let next: Node<number> | undefined
    const subgraph: CallGraph<number> = new CallGraph()

    // Add root node (displayed as selected node).
    subgraph.AddNode(root)

    // Add most significant parents with a max distance of maxCallerLevel.
    next = root
    for (let level = 0; level < maxCallerLevel && next !== undefined; level++) {
      next = this.addSignificantParentByEdge(subgraph, next)
    }

    // Add most significant children with a max distance of maxCalleeLevel.
    next = root
    for (let level = 0; level < maxCalleeLevel && next !== undefined; level++) {
      next = this.addSignificantChildByEdge(subgraph, next)
    }

    // Add all edges that connect any nodes of the sub graph.
    this.graph.nodes.forEach((node: Node<number>) => {
      this.addEdgesForNode(subgraph, node)
    })

    // Generate virtual parent nodes and edges with negative ID numbers.
    subgraph.nodes.forEach((node: Node<number>) => {
      this.addVirtualParent(subgraph, node)
    })

    // Generate virtual child nodes and edges with negative ID numbers.
    subgraph.nodes.forEach((node: Node<number>) => {
      this.addVirtualChild(subgraph, node)
    })

    return subgraph
  }

  public removeNode(node: DrawableNode<number>) {
    // Remove the node and it's edges.
    this.subgraph.RemoveNode(node)

    // The following code is not optimized and goes the naive
    // approach, rebuilding all virtual nodes in the subgraph.

    // Remove virtual nodes and edges.
    this.subgraph.nodes.forEach((node: Node<number>) => {
      if (node.ID < 0) {
        this.subgraph.RemoveNode(node)
      }
    })

    // Rebuild virtual nodes and edges.
    this.subgraph.nodes.forEach((node: Node<number>) => {
      this.addVirtualParent(this.subgraph, node)
      this.addVirtualChild(this.subgraph, node)
    })
  }

  // Amend the current subgraph by expanding the given
  // (virtual) node.
  // A virtual node has exactly one edge, either incoming or outgoing.
  public expandNode(vnode: DrawableNode<number>) {
    let edges = this.subgraph.outgoing.get(vnode.ID)

    if (edges !== undefined) {
      // vnode is a virtual parent node and has exactly one child node.
      const childNode = this.subgraph.GetNode(edges[0].DstID)!

      // Add one parent node previously "folded" into the virtual node.
      const newParentNode = this.addSignificantParentByEdge(
        this.subgraph,
        childNode
      )!
      // Add the needed edges (callers and callees) for the new node.
      this.addEdgesForNode(this.subgraph, newParentNode)
      // Attach a new virtual parent the the new node.
      this.addVirtualParent(this.subgraph, newParentNode)
      // Attach a new virtual child to the new node.
      this.addVirtualChild(this.subgraph, newParentNode)

      // Attach a new virtual parent to the child node as we remove the old one below.
      this.addVirtualParent(this.subgraph, childNode)
    } else {
      // vnode is a virtual child node and has exactly one parent node.
      edges = this.subgraph.incoming.get(vnode.ID)!
      const parentNode = this.subgraph.GetNode(edges[0].SrcID)!

      // Add one child node previously "folded" into the virtual node.
      const newChildNode = this.addSignificantChildByEdge(
        this.subgraph,
        parentNode
      )!
      // Add the needed edges (callers and callees) for the new node.
      this.addEdgesForNode(this.subgraph, newChildNode)
      // Attach a new virtual parent the the new node.
      this.addVirtualParent(this.subgraph, newChildNode)
      // Attach a new virtual child to the new node.
      this.addVirtualChild(this.subgraph, newChildNode)

      // Attach a new virtual child to the parent node as we remove the old one below.
      this.addVirtualChild(this.subgraph, parentNode)
    }

    // Finally remove the old virtual node (including the edge).
    this.subgraph.RemoveNode(vnode)

    return this.subGraph
  }

  // setCentralNode generates a subgraph around the given node
  // and feeds it to the graph layout engine.
  // The maximum level of callers and callees is hard-coded to 2.
  public setSelectedNode(node: DrawableNode<number> | undefined) {
    if (node === undefined) {
      return
    }

    // Create a subgraph from the given node.
    // To get a full level 2 subgraph without "folding":
    //     this.subgraph = this.graph.SubGraph(node, 2, 2)
    this.subgraph = this.subGraph(node, 3, 3)

    this.calculateLayout()
  }

  // ensures that the precalculated values are reset, to avoid using previous values in the comparison
  private resetCachedCalculations() {
    this.maxX = 0
    this.maxY = 0
  }

  public calculateLayout() {
    this.resetCachedCalculations()

    // Create a new graphengine as there is no 'clearall()' or 'reset()' function.
    this.graphengine = new dagre.graphlib.Graph()

    // Set an object for the graph label
    this.graphengine.setGraph({})

    // Default to assigning a new object as a label for each new edge.
    this.graphengine.setDefaultEdgeLabel(function() {
      return {}
    })

    // Add nodes and edges to the graph engine.
    this.constructGraph(this.subgraph)

    // Do the layout calculation.
    dagre.layout(this.graphengine)

    // Calculate maxX and maxY
    for (let v of this.graphengine.nodes()) {
      let node = this.graphengine.node(v)

      this.maxX = Math.max(this.maxX, node.x + node.width)
      this.maxY = Math.max(this.maxY, node.y + node.height)
    }

    for (let e of this.graphengine.edges()) {
      let edge = this.graphengine.edge(e)

      for (let point of edge.points) {
        this.maxX = Math.max(this.maxX, point.x)
        this.maxY = Math.max(this.maxY, point.y)
      }
    }
  }

  // Return the node including the rectangle from the layout engine.
  public getDrawableNode(nodeID: number): DrawableNode<number> {
    return this.subgraph.nodes.get(nodeID)! as DrawableNode<number>
  }

  // Return the nodes including the rectangle from the layout engine.
  public getDrawableNodes(): DrawableNode<number>[] {
    let result = new Array<DrawableNode<number>>()

    for (let v of this.graphengine.nodes()) {
      let dagre_node = this.graphengine.node(v)
      let node = this.subgraph.nodes.get(+v) as DrawableNode<number>
      node.Rectangle = {
        x: dagre_node.x,
        y: dagre_node.y,
        width: dagre_node.width,
        height: dagre_node.height,
      }
      result.push(node)
    }

    return result
  }

  private getAdjustedEdgePointsForCircles(
    edge: DrawableEdge<number>,
    dagreCluster: any,
    index: number
  ) {
    const edgeX = edge.Points[index].x
    const edgeY = edge.Points[index].y

    const centerX = dagreCluster.x
    const centerY = dagreCluster.y

    const dx = centerX - edgeX
    const dy = centerY - edgeY

    const dist = Math.sqrt(dx * dx + dy * dy)

    const nx = dx / dist
    const ny = dy / dist

    const radius = dagreCluster.width / 2

    let newPoints = [...edge.Points]
    newPoints[index] = {
      x: dagreCluster.x - radius * nx,
      y: dagreCluster.y - radius * ny,
    }

    return newPoints
  }

  // Return the edges including the connection points from the layout engine.
  public getDrawableEdges(): DrawableEdge<number>[] {
    let result = new Array<DrawableEdge<number>>()

    for (let v of this.graphengine.edges()) {
      let dagre_edge = this.graphengine.edge(v)
      let edge = this.subgraph.GetEdge(+v.v, +v.w) as DrawableEdge<number>

      edge.Points = dagre_edge.points

      // because cluster are circles we need to adjust the edges so that they get closer to the borders
      if (edge.SrcID < 0) {
        const dagreCluster = this.graphengine.node(`${edge.SrcID}`)
        edge.Points = this.getAdjustedEdgePointsForCircles(
          edge,
          dagreCluster,
          0
        )
      }

      // because cluster are circles we need to adjust the edges so that they get closer to the borders
      if (edge.DstID < 0) {
        const dagreCluster = this.graphengine.node(`${edge.DstID}`)
        edge.Points = this.getAdjustedEdgePointsForCircles(
          edge,
          dagreCluster,
          2
        )
      }

      result.push(edge)
    }

    return result
  }

  // Return the calculated size from the layout engine.
  public getDimensions(): number[] {
    return [this.maxX, this.maxY]
  }

  // Return the current subgraph.
  // We have to use a clone and not a reference, else the graph stored in the history
  // buffer would not be constant.
  public getCurrentGraph(): CallGraph<number> {
    return this.subgraph.clone()
  }

  // Set a graph as current subgraph.
  // We have to use a clone and not a reference, else the graph stored in the history
  // buffer would not be constant.
  public setCurrentGraph(graph: CallGraph<number>) {
    this.subgraph = graph.clone()
  }
}
