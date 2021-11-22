/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

interface CycleDetectionResult {
  hasCycle: boolean;
  path: string[];
}

type Graph = Record<string, string[] | null | undefined>;
type BreadCrumbs = Record<string, boolean>;

export class DependencyManager {
  static orderDependencies(graph: Graph = {}) {
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
  private static getSortedDependencies(graph: Graph = {}): CycleDetectionResult {
    const sortedVertices: Set<string> = new Set();
    return Object.keys(graph).reduce<CycleDetectionResult>((cycleInfo, srcVertex) => {
      const info = DependencyManager.sortVerticesFrom(srcVertex, graph, sortedVertices, {}, {});
      if (info.hasCycle) {
        return info;
      }
      return cycleInfo.hasCycle ? cycleInfo : { ...cycleInfo, path: [...sortedVertices] };
    }, DependencyManager.getDefaultCycleInfo());
  }

  /**
   * Modified DFS algorithm for topological sort.
   * @param {string} srcVertex - a source vertex - the start point of dependencies ordering.
   * @param {Graph} graph - graph of dependencies, represented in the adjacency list form.
   * @param {Set<string>} sortedVertices - ordered dependencies path from the free to the dependent vertex.
   * @param {BreadCrumbs} visited - record of visited vertices.
   * @param {BreadCrumbs} inpath - record of vertices, which was met in the path. Is used for detecting cycles.
   */
  private static sortVerticesFrom(
    srcVertex: string,
    graph: Graph,
    sortedVertices: Set<string>,
    visited: BreadCrumbs = {},
    inpath: BreadCrumbs = {}
  ): CycleDetectionResult {
    visited[srcVertex] = true;
    inpath[srcVertex] = true;
    const cycleInfo = graph[srcVertex]?.reduce<CycleDetectionResult | undefined>((info, vertex) => {
      if (inpath[vertex]) {
        return { hasCycle: true, path: [...Object.keys(visited), vertex] };
      } else if (!visited[vertex]) {
        return DependencyManager.sortVerticesFrom(vertex, graph, sortedVertices, visited, inpath);
      }
      return info;
    }, undefined);

    inpath[srcVertex] = false;

    if (!sortedVertices.has(srcVertex)) {
      sortedVertices.add(srcVertex);
    }

    return cycleInfo ?? DependencyManager.getDefaultCycleInfo();
  }

  private static getDefaultCycleInfo() {
    return { hasCycle: false, path: [] };
  }

  private static getCyclePathError(cyclePath: CycleDetectionResult['path']) {
    const cycleString = cyclePath.join(' -> ');
    return `Circular dependency detected while setting up services: ${cycleString}`;
  }

  private static throwCyclicPathError(error: string) {
    // eslint-disable-next-line no-console
    console.error(error);
    throw new Error(error);
  }
}
