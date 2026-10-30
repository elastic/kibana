/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

/** Where an import request resolved to, reduced to what the walk needs. */
export type ImportTarget =
  | { kind: 'source'; absolute: string }
  | { kind: 'node_module'; name: string }
  | { kind: 'other' };

export interface WalkOptions {
  /** Absolute paths of the files to start from. */
  entryPaths: string[];
  /** Returns the eagerly loaded import requests of a source file. */
  readValueImports: (absolutePath: string) => string[];
  /** Resolves an import request made from `dirname`. */
  resolve: (request: string, dirname: string) => ImportTarget;
  isBannedNodeModule: (name: string) => boolean;
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
  readValueImports,
  resolve,
  isBannedNodeModule,
}: WalkOptions): WalkResult => {
  // BFS tree: file -> file it was first reached from (null for entries). Because the walk is
  // breadth-first, following parents from any file yields a shortest chain.
  const parent = new Map<string, string | null>();
  const queue: string[] = [];
  for (const entry of entryPaths) {
    if (!parent.has(entry)) {
      parent.set(entry, null);
      queue.push(entry);
    }
  }

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

  const violations: Violation[] = [];
  const seenViolations = new Set<string>();

  for (let index = 0; index < queue.length; index++) {
    const file = queue[index];
    const dirname = Path.dirname(file);

    for (const request of readValueImports(file)) {
      const target = resolve(request, dirname);

      if (target.kind === 'node_module') {
        if (!isBannedNodeModule(target.name)) {
          continue;
        }
        const key = `${file}\0${target.name}`;
        if (seenViolations.has(key)) {
          continue;
        }
        seenViolations.add(key);
        violations.push({
          importer: file,
          nodeModule: target.name,
          request,
          chain: chainTo(file),
        });
        continue;
      }

      if (target.kind === 'source' && !parent.has(target.absolute)) {
        parent.set(target.absolute, file);
        queue.push(target.absolute);
      }
    }
  }

  return { violations, fileCount: parent.size };
};
