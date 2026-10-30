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

import { isBannedNodeModule } from './banned_packages';
import {
  diffBaseline,
  readBaseline,
  writeBaseline,
  type BaselineDiff,
  type BaselineViolations,
} from './baseline';
import { findValueImports } from './find_value_imports';
import {
  walkServerImportGraph,
  type ImportTarget,
  type Violation,
} from './walk_server_import_graph';

export const BASELINE_PATH = Path.resolve(__dirname, '..', 'baseline.json');

const CORE_SERVER_ENTRY = '@kbn/core/server';

export interface CheckOptions {
  log: ToolingLog;
  /** Rewrite the baseline to the current violations instead of comparing against it. */
  updateBaseline?: boolean;
  baselinePath?: string;
}

export interface CheckResult {
  passed: boolean;
  entryCount: number;
  fileCount: number;
  violations: Violation[];
  diff: BaselineDiff;
}

const findEntryPaths = (resolver: ImportResolver): string[] => {
  const entries: string[] = [];

  for (const pkg of getPackages(REPO_ROOT)) {
    if (!pkg.isPlugin() || !pkg.manifest.plugin.server) {
      continue;
    }
    const serverDir = Path.resolve(REPO_ROOT, pkg.normalizedRepoRelativeDir, 'server');
    const entry = ['index.ts', 'index.js']
      .map((name) => Path.resolve(serverDir, name))
      .find((candidate) => Fs.existsSync(candidate));
    if (entry) {
      entries.push(entry);
    }
  }

  const core = resolver.resolve(CORE_SERVER_ENTRY, REPO_ROOT);
  if (core?.type === 'file') {
    entries.push(core.absolute);
  }

  return entries;
};

const toImportTarget =
  (resolver: ImportResolver) =>
  (request: string, dirname: string): ImportTarget => {
    const result = resolver.resolve(request, dirname);
    if (result?.type !== 'file') {
      return { kind: 'other' };
    }
    if (result.nodeModule && !resolver.isRepoPkg(result.nodeModule)) {
      return { kind: 'node_module', name: result.nodeModule };
    }
    return { kind: 'source', absolute: result.absolute };
  };

const readValueImports = (absolutePath: string): string[] => {
  let content: string;
  try {
    content = Fs.readFileSync(absolutePath, 'utf8');
  } catch {
    return [];
  }
  return findValueImports(absolutePath, content);
};

const relative = (absolute: string): string => Path.relative(REPO_ROOT, absolute);

const toBaselineViolations = (violations: Violation[]): BaselineViolations => {
  const result: BaselineViolations = {};
  for (const { importer, nodeModule } of violations) {
    const key = relative(importer);
    (result[key] ??= []).push(nodeModule);
  }
  return result;
};

const reportAdded = (log: ToolingLog, diff: BaselineDiff, violations: Violation[]): void => {
  log.error(
    `${diff.added.length} new browser-only import(s) are reachable from the Kibana server entry points:`
  );
  for (const { importer, nodeModule } of diff.added) {
    const violation = violations.find(
      (candidate) =>
        relative(candidate.importer) === importer && candidate.nodeModule === nodeModule
    );
    if (!violation) {
      continue;
    }
    log.write('');
    log.write(
      `  ${importer} imports ${nodeModule} (\`${violation.request}\`) and is loaded by the server:`
    );
    violation.chain.forEach((file, index) => {
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

const reportRemoved = (log: ToolingLog, diff: BaselineDiff, baselinePath: string): void => {
  log.error(
    `${diff.removed.length} baseline entr${
      diff.removed.length === 1 ? 'y is' : 'ies are'
    } no longer reachable from the server. Nice! Remove them from the baseline with:`
  );
  log.write(`  node scripts/check_server_import_graph --update-baseline`);
  for (const { importer, nodeModule } of diff.removed) {
    log.write(`    - ${importer} (${nodeModule})`);
  }
  log.write(`  (${relative(baselinePath)})`);
};

/**
 * Walks the eagerly loaded import graph from every server entry point and fails when a source
 * file reachable from it imports a browser-only node module that is not in the baseline, or when
 * the baseline lists a violation that no longer exists.
 */
export const checkServerImportGraph = async ({
  log,
  updateBaseline = false,
  baselinePath = BASELINE_PATH,
}: CheckOptions): Promise<CheckResult> => {
  const resolver = ImportResolver.create(REPO_ROOT);
  const entryPaths = findEntryPaths(resolver);

  const { violations, fileCount } = walkServerImportGraph({
    entryPaths,
    readValueImports,
    resolve: toImportTarget(resolver),
    isBannedNodeModule,
  });

  const current = toBaselineViolations(violations);

  if (updateBaseline) {
    writeBaseline(baselinePath, current);
    log.success(
      `wrote ${violations.length} violation(s) across ${
        Object.keys(current).length
      } file(s) to ${relative(baselinePath)}`
    );
    return {
      passed: true,
      entryCount: entryPaths.length,
      fileCount,
      violations,
      diff: { added: [], removed: [] },
    };
  }

  const diff = diffBaseline(readBaseline(baselinePath), current);
  const passed = diff.added.length === 0 && diff.removed.length === 0;

  if (diff.added.length > 0) {
    reportAdded(log, diff, violations);
  }
  if (diff.removed.length > 0) {
    reportRemoved(log, diff, baselinePath);
  }
  if (passed) {
    log.success(
      `${fileCount} source files reachable from ${entryPaths.length} server entry points; ` +
        `no new browser-only imports (${violations.length} baselined)`
    );
  }

  return { passed, entryCount: entryPaths.length, fileCount, violations, diff };
};
