/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** A resolved import of a source file: another source file, or a node module. */
export type ImportTarget =
  | { request: string; kind: 'source'; absolute: string }
  | { request: string; kind: 'node_module'; name: string };

export interface WalkOptions {
  /** Absolute paths of the files to start from. */
  entryPaths: string[];
  /** Resolved eagerly loaded imports of a source file; unresolvable requests are left out. */
  getImports: (absolutePath: string) => ImportTarget[];
  bannedNodeModules: ReadonlySet<string>;
}

export interface Violation {
  /** Absolute path of the source file importing the banned module. */
  importer: string;
  nodeModule: string;
  /** The import request as written in `importer`. */
  request: string;
  /** Shortest path of absolute source paths from an entry point to `importer`, inclusive. */
  chain: string[];
}

export interface WalkResult {
  violations: Violation[];
  /** Number of distinct source files reached, entries included. */
  fileCount: number;
}

/**
 * Breadth-first walk of the eagerly loaded import graph from the given entry points, stopping at
 * node modules. Reports every source file that imports a banned node module, together with the
 * shortest chain of imports that makes it reachable.
 */
export const walkServerImportGraph = ({
  entryPaths,
  getImports,
  bannedNodeModules,
}: WalkOptions): WalkResult => {
  // BFS tree: file -> file it was first reached from (null for entries). Because the walk is
  // breadth-first, following parents from any file yields a shortest chain.
  const parent = new Map<string, string | null>(entryPaths.map((entry) => [entry, null]));
  const queue = [...parent.keys()];
  const violations = new Map<string, Violation>();

  const chainTo = (file: string): string[] => {
    const chain: string[] = [];
    for (
      let current: string | null = file;
      current !== null;
      current = parent.get(current) ?? null
    ) {
      chain.unshift(current);
    }
    return chain;
  };

  for (let index = 0; index < queue.length; index++) {
    const file = queue[index];

    for (const target of getImports(file)) {
      if (target.kind === 'source') {
        if (!parent.has(target.absolute)) {
          parent.set(target.absolute, file);
          queue.push(target.absolute);
        }
        continue;
      }

      const key = `${file}\0${target.name}`;
      if (bannedNodeModules.has(target.name) && !violations.has(key)) {
        violations.set(key, {
          importer: file,
          nodeModule: target.name,
          request: target.request,
          chain: chainTo(file),
        });
      }
    }
  }

  return { violations: [...violations.values()], fileCount: parent.size };
};
