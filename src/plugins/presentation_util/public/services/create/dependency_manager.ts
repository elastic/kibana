/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

type GraphVertex = string | number | symbol;
type Graph<T extends GraphVertex = GraphVertex> = Record<T, T[] | null | undefined>;
type BreadCrumbs = Record<GraphVertex, boolean>;

interface CycleDetectionResult<T extends GraphVertex = GraphVertex> {
  hasCycle: boolean;
  path: T[];
}

export class DependencyManager {
  static orderDependencies<T extends GraphVertex = GraphVertex>(graph: Graph<T>) {
    const cycleInfo = DependencyManager.getSortedDependencies(graph);
    if (cycleInfo.hasCycle) {
      const error = DependencyManager.getCyclePathError(cycleInfo.path);
      DependencyManager.throwCyclicPathError(error);
    }

    return cycleInfo.path;
  }

  /**
   * DFS algorithm for checking if graph is a DAG (Directed Acyclic Graph)
   * and sorting topogy (dependencies) if graph is DAG.
   * @param {Graph} graph - graph of dependencies.
   */
  private static getSortedDependencies<T extends GraphVertex = GraphVertex>(
    graph: Graph<T> = {} as Graph<T>
  ): CycleDetectionResult<T> {
    const sortedVertices: Set<T> = new Set();
    const vertices = Object.keys(graph) as T[];
    return vertices.reduce<CycleDetectionResult<T>>((cycleInfo, srcVertex) => {
      if (cycleInfo.hasCycle) {
        return cycleInfo;
      }

      return DependencyManager.sortVerticesFrom(
        srcVertex,
        graph,
        sortedVertices,
        {},
        {},
        cycleInfo
      );
    }, DependencyManager.createCycleInfo());
  }

  /**
   * Modified DFS algorithm for topological sort.
   * @param {T extends GraphVertex} srcVertex - a source vertex - the start point of dependencies ordering.
   * @param {Graph<T extends GraphVertex>} graph - graph of dependencies, represented in the adjacency list form.
   * @param {Set<GraphVertex>} sortedVertices - ordered dependencies path from the free to the dependent vertex.
   * @param {BreadCrumbs} visited - record of visited vertices.
   * @param {BreadCrumbs} inpath - record of vertices, which was met in the path. Is used for detecting cycles.
   */
  private static sortVerticesFrom<T extends GraphVertex = GraphVertex>(
    srcVertex: T,
    graph: Graph<T>,
    sortedVertices: Set<T>,
    visited: BreadCrumbs = {},
    inpath: BreadCrumbs = {},
    cycle: CycleDetectionResult<T>
  ): CycleDetectionResult<T> {
    visited[srcVertex] = true;
    inpath[srcVertex] = true;

    const vertexEdges =
      graph[srcVertex] === undefined || graph[srcVertex] === null ? [] : graph[srcVertex];

    cycle = vertexEdges!.reduce<CycleDetectionResult<T>>((info, vertex) => {
      if (inpath[vertex]) {
        return { ...info, hasCycle: true };
      } else if (!visited[vertex]) {
        return DependencyManager.sortVerticesFrom(
          vertex,
          graph,
          sortedVertices,
          visited,
          inpath,
          info
        );
      }
      return info;
    }, cycle);

    inpath[srcVertex] = false;

    if (!sortedVertices.has(srcVertex)) {
      sortedVertices.add(srcVertex);
    }

    return {
      ...cycle,
      path: [...sortedVertices],
    };
  }

  private static createCycleInfo<T extends GraphVertex = GraphVertex>(
    path: T[] = [],
    hasCycle: boolean = false
  ): CycleDetectionResult<T> {
    return { hasCycle, path };
  }

  private static getCyclePathError<T extends GraphVertex = GraphVertex>(
    cyclePath: CycleDetectionResult<T>['path']
  ) {
    const cycleString = cyclePath.join(' -> ');
    return `Circular dependency detected while setting up services: ${cycleString}`;
  }

  private static throwCyclicPathError(error: string) {
    throw new Error(error);
  }
}
