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

import { ImportLocator } from '@kbn/import-locator';
import { ImportResolver } from '@kbn/import-resolver';
import { REPO_ROOT } from '@kbn/repo-info';
import { getPackages } from '@kbn/repo-packages';
import type { ToolingLog } from '@kbn/tooling-log';

import {
  walkServerImportGraph,
  type ImportTarget,
  type Violation,
} from './walk_server_import_graph';

/**
 * Node modules that must never be loaded by the Kibana server. Matched against the resolved node
 * module name, so `@elastic/eui/lib/...` is caught while the pure `@elastic/eui-theme-*` packages
 * are not.
 */
const BANNED_NODE_MODULES: ReadonlySet<string> = new Set(['@elastic/eui']);

const relative = (absolute: string): string => Path.relative(REPO_ROOT, absolute);

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

const reportViolations = (log: ToolingLog, violations: Violation[]): void => {
  log.error(
    `${violations.length} browser-only import(s) are reachable from the Kibana server entry points:`
  );
  for (const { importer, nodeModule, request, chain } of violations) {
    log.write('');
    log.write(
      `  ${relative(importer)} imports ${nodeModule} (\`${request}\`) and is loaded by the server:`
    );
    chain.forEach((file, index) => {
      log.write(`    ${'  '.repeat(index)}${index === 0 ? '' : '→ '}${relative(file)}`);
    });
  }
  log.write('');
  log.write(
    '  Fix: move the browser-only code out of the module the server imports, for example out of a ' +
      '`common/` or package barrel into a module that only browser code imports.'
  );
  log.write(
    '  Type-only usage is fine as long as it is spelled `import type`. Lazy `import()` does not help: ' +
      'the walk follows it, because server code should not load these packages at all.'
  );
};

export interface CheckOptions {
  log: ToolingLog;
  /** Absolute paths to start from instead of every server entry point in the repo. */
  entryPaths?: string[];
}

/**
 * Walks the import graph from every server entry point and fails when a source file reachable
 * from it imports a browser-only node module.
 */
export const checkServerImportGraph = async ({
  log,
  entryPaths: entryPathsOverride,
}: CheckOptions): Promise<boolean> => {
  const resolver = ImportResolver.create(REPO_ROOT);
  const locator = new ImportLocator({ ignoreTypeOnly: true });
  const entryPaths = entryPathsOverride ?? findEntryPaths(resolver);

  const getImports = (file: string): ImportTarget[] => {
    const targets: ImportTarget[] = [];
    for (const request of locator.get(file, Fs.readFileSync(file, 'utf8'))) {
      const result = resolver.resolve(request, Path.dirname(file));
      if (result?.type !== 'file') {
        continue;
      }
      targets.push(
        result.nodeModule && !resolver.isRepoPkg(result.nodeModule)
          ? { request, kind: 'node_module', name: result.nodeModule }
          : { request, kind: 'source', absolute: result.absolute }
      );
    }
    return targets;
  };

  const { violations, fileCount } = walkServerImportGraph({
    entryPaths,
    getImports,
    bannedNodeModules: BANNED_NODE_MODULES,
  });

  if (violations.length > 0) {
    reportViolations(log, violations);
    return false;
  }

  log.success(
    `${fileCount} source files reachable from ${entryPaths.length} server entry points; ` +
      `no browser-only imports`
  );
  return true;
};
