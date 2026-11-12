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

const BASELINE_PATH = Path.resolve(__dirname, '..', 'baseline.json');
const BASELINE_COMMENT =
  'Source files reachable from the Kibana server entry points that import browser-only node modules, ' +
  'as "<importer> <node module>". This list may only shrink: fix the chain (move the browser-only code ' +
  'out of the module the server imports) and run `node scripts/check_server_import_graph --update-baseline` ' +
  'to remove the entry.';

const relative = (absolute: string): string => Path.relative(REPO_ROOT, absolute);

const readBaseline = (): Set<string> =>
  new Set<string>(JSON.parse(Fs.readFileSync(BASELINE_PATH, 'utf8')).violations);

const writeBaseline = (violations: Iterable<string>): void => {
  const file = { '//': BASELINE_COMMENT, violations: [...violations].sort() };
  Fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(file, null, 2)}\n`);
};

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

const reportAdded = (log: ToolingLog, added: Violation[]): void => {
  log.error(
    `${added.length} new browser-only import(s) are reachable from the Kibana server entry points:`
  );
  for (const { importer, nodeModule, request, chain } of added) {
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

const reportRemoved = (log: ToolingLog, removed: string[]): void => {
  log.error(
    `${removed.length} baseline entr${
      removed.length === 1 ? 'y is' : 'ies are'
    } no longer reachable from the server. Nice! Remove them from ${relative(BASELINE_PATH)} with:`
  );
  log.write('  node scripts/check_server_import_graph --update-baseline');
  for (const entry of removed) {
    log.write(`    - ${entry}`);
  }
};

export interface CheckOptions {
  log: ToolingLog;
  /** Rewrite the baseline to the current violations instead of comparing against it. */
  updateBaseline?: boolean;
}

/**
 * Walks the eagerly loaded import graph from every server entry point and fails when a source
 * file reachable from it imports a browser-only node module that is not in the baseline, or when
 * the baseline lists a violation that no longer exists.
 */
export const checkServerImportGraph = async ({
  log,
  updateBaseline = false,
}: CheckOptions): Promise<boolean> => {
  const resolver = ImportResolver.create(REPO_ROOT);
  const locator = new ImportLocator({ ignoreTypeOnly: true });
  const entryPaths = findEntryPaths(resolver);

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
  const current = new Map(
    violations.map((violation) => [
      `${relative(violation.importer)} ${violation.nodeModule}`,
      violation,
    ])
  );

  if (updateBaseline) {
    writeBaseline(current.keys());
    log.success(`wrote ${current.size} violation(s) to ${relative(BASELINE_PATH)}`);
    return true;
  }

  const baseline = readBaseline();
  const added = [...current]
    .filter(([key]) => !baseline.has(key))
    .map(([, violation]) => violation);
  const removed = [...baseline].filter((key) => !current.has(key));

  if (added.length > 0) {
    reportAdded(log, added);
  }
  if (removed.length > 0) {
    reportRemoved(log, removed);
  }
  const passed = added.length === 0 && removed.length === 0;
  if (passed) {
    log.success(
      `${fileCount} source files reachable from ${entryPaths.length} server entry points; ` +
        `no new browser-only imports (${current.size} baselined)`
    );
  }
  return passed;
};
