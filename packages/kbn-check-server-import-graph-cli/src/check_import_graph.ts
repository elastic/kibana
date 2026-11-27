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
import type { ImportResolver } from '@kbn/import-resolver';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';

import { walkImportGraph, type ImportTarget } from './walk_import_graph';

// How FTR loads test files: `loadTestFile(require.resolve('./x'))`, `testFiles: [resolve(__dirname, './x')]`.
const TEST_FILE_PATH =
  /\b(?:require\.resolve\(\s*|resolve\(\s*__dirname\s*,\s*)['"]([^'"]+)['"]\s*\)/g;
const SOURCE_FILE = /\.[cm]?[jt]sx?$/;

const relative = (absolute: string): string => Path.relative(REPO_ROOT, absolute);

const createGetImports = (resolver: ImportResolver, followTestFilePaths: boolean) => {
  const locator = new ImportLocator({ ignoreTypeOnly: true });

  return (file: string): ImportTarget[] => {
    const source = Fs.readFileSync(file, 'utf8');
    const requests = new Set(locator.get(file, source));
    if (followTestFilePaths) {
      for (const [, request] of source.matchAll(TEST_FILE_PATH)) {
        requests.add(request);
      }
    }

    const targets: ImportTarget[] = [];
    for (const request of requests) {
      const result = resolver.resolve(request, Path.dirname(file));
      if (result?.type !== 'file') {
        continue;
      }
      if (result.nodeModule && !resolver.isRepoPkg(result.nodeModule)) {
        targets.push({ request, kind: 'node_module', name: result.nodeModule });
      } else if (SOURCE_FILE.test(result.absolute)) {
        targets.push({ request, kind: 'source', absolute: result.absolute });
      }
    }
    return targets;
  };
};

export interface CheckImportGraphOptions {
  log: ToolingLog;
  resolver: ImportResolver;
  entryPaths: string[];
  bannedNodeModules: ReadonlySet<string>;
  /** What runs the entry points, e.g. "server". */
  runtime: string;
  /** Also follow the paths FTR loads test files from. */
  followTestFilePaths?: boolean;
  fix: string[];
}

/** Fails when a source file reachable from `entryPaths` imports a banned node module. */
export const checkImportGraph = ({
  log,
  resolver,
  entryPaths,
  bannedNodeModules,
  runtime,
  followTestFilePaths = false,
  fix,
}: CheckImportGraphOptions): boolean => {
  const { violations, fileCount } = walkImportGraph({
    entryPaths,
    getImports: createGetImports(resolver, followTestFilePaths),
    bannedNodeModules,
  });

  if (violations.length === 0) {
    log.success(
      `${fileCount} source files reachable from ${entryPaths.length} ${runtime} entry points; ` +
        `no imports of ${[...bannedNodeModules].join(', ')}`
    );
    return true;
  }

  log.error(`${violations.length} banned import(s) are reachable from ${runtime} entry points:`);
  for (const { importer, nodeModule, request, chain } of violations) {
    log.write('');
    log.write(`  ${relative(importer)} imports ${nodeModule} (\`${request}\`):`);
    chain.forEach((file, index) => {
      log.write(`    ${'  '.repeat(index)}${index === 0 ? '' : '→ '}${relative(file)}`);
    });
  }
  log.write('');
  for (const line of fix) {
    log.write(`  ${line}`);
  }
  return false;
};
