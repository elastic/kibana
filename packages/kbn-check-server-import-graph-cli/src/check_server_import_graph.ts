/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';

import { ImportResolver } from '@kbn/import-resolver';
import { REPO_ROOT } from '@kbn/repo-info';
import { getPackages } from '@kbn/repo-packages';
import type { ToolingLog } from '@kbn/tooling-log';

import { checkImportGraph } from './check_import_graph';

/**
 * Node modules that must never be loaded by the Kibana server. Matched against the resolved node
 * module name, so `@elastic/eui/lib/...` is caught while the pure `@elastic/eui-theme-*` packages
 * are not.
 */
export const BANNED_NODE_MODULES: ReadonlySet<string> = new Set([
  '@elastic/eui',
  '@elastic/charts',
  '@emotion/react',
  'react-intl',
  'react-use',
  '@xyflow/react',
  'd3',
  '@reduxjs/toolkit',
  'redux-toolkit-v1',
]);

/** Every plugin `server/index.ts` plus `@kbn/core/server`. */
const findEntryPaths = (resolver: ImportResolver): string[] => {
  const entries = getPackages(REPO_ROOT).flatMap((pkg) => {
    if (!pkg.isPlugin() || !pkg.manifest.plugin.server) {
      return [];
    }
    const serverDir = Path.resolve(REPO_ROOT, pkg.normalizedRepoRelativeDir, 'server');
    const entry = ['index.ts', 'index.js']
      .map((name) => Path.resolve(serverDir, name))
      .find((candidate) => Fs.existsSync(candidate));
    return entry ? [entry] : [];
  });

  const core = resolver.resolve('@kbn/core/server', REPO_ROOT);
  if (core?.type === 'file') {
    entries.push(core.absolute);
  }
  return entries;
};

export interface CheckOptions {
  log: ToolingLog;
  /** Absolute paths to start from instead of every server entry point in the repo. */
  entryPaths?: string[];
  /** Node modules to look for instead of `BANNED_NODE_MODULES`. */
  bannedNodeModules?: ReadonlySet<string>;
}

/**
 * Walks the import graph from every server entry point and fails when a source file reachable
 * from it imports a banned node module.
 */
export const checkServerImportGraph = async ({
  log,
  entryPaths: entryPathsOverride,
  bannedNodeModules = BANNED_NODE_MODULES,
}: CheckOptions): Promise<boolean> => {
  const resolver = ImportResolver.create(REPO_ROOT);
  return checkImportGraph({
    log,
    resolver,
    entryPaths: entryPathsOverride ?? findEntryPaths(resolver),
    bannedNodeModules,
    runtime: 'server',
    fix: [
      'Fix: move the browser-only code out of the module the server imports, for example out of a ' +
        '`common/` or package barrel into a module that only browser code imports.',
      'Type-only usage is fine as long as it is spelled `import type`. Lazy `import()` does not help: ' +
        'the walk follows it, because server code should not load these packages at all.',
    ],
  });
};
