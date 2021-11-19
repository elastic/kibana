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

export class DependencyManager {
  static orderDependencies(graph: Graph = {}) {
    const cycleInfo = DependencyManager.detectCycle(graph);
    if (cycleInfo.hasCycle) {
      const error = DependencyManager.getCyclePathError(cycleInfo.path);
      DependencyManager.throwCyclicPathError(error);
    }

    return cycleInfo.path;
  }

  /**
   * DFS algorithm for checking if graph is a DAG (Directed Acyclic Graph)
   * and sorting topogy if graph is DAG
   * @param {Graph} graph - graph of dependencies
   */
  private static detectCycle(graph: Graph = {}): CycleDetectionResult {
    const stack: Set<string> = new Set();
    return Object.keys(graph).reduce<CycleDetectionResult>((cycleInfo, node) => {
      const info = DependencyManager.detectCycleFn(node, graph, {}, {}, stack);
      if (info.hasCycle) {
        return info;
      }
      return cycleInfo.hasCycle ? cycleInfo : { ...cycleInfo, path: [...stack] };
    }, DependencyManager.getDefaultCycleInfo());
  }

  private static detectCycleFn(
    src: string,
    graph: Graph,
    visited: Record<string, boolean> = {},
    inpath: Record<string, boolean> = {},
    stack: Set<string>
  ): CycleDetectionResult {
    visited[src] = true;
    inpath[src] = true;
    const cycleInfo = graph[src]?.reduce<CycleDetectionResult | undefined>((info, node) => {
      if (inpath[node]) {
        return { hasCycle: true, path: [...Object.keys(visited), node] };
      } else if (!visited[node]) {
        return DependencyManager.detectCycleFn(node, graph, visited, inpath, stack);
      }
      return info;
    }, undefined);

    inpath[src] = false;

    if (!stack.has(src)) {
      stack.add(src);
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
