/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { existsSync, readFileSync, readdirSync } from 'fs';
import nodePath from 'path';

// @ts-ignore
import { REPO_ROOT } from '@kbn/repo-info';

import { getCodeOwnersForFile, getPathsWithOwnersReversed } from '../lib/code_owners.ts';
import { cruiseExternalDeps } from '../dependency_graph/providers/cruiser.ts';
import { buildRenovateMatcher, type RenovateMatch } from './renovate.ts';
import type { PathWithOwners } from '../lib/code_owners.ts';

// ---------------------------------------------------------------------------
// Plugin discovery
// ---------------------------------------------------------------------------

/**
 * Expand `searchPaths` to plugin directories by listing immediate subdirectories.
 * Pass the direct parent of your plugins:
 *   x-pack/platform/plugins/shared   → 65 plugins (one per subdir)
 *   x-pack/solutions/security/plugins → 13 plugins
 *
 * Cruiser scans whatever directory it receives, so no kibana.jsonc validation
 * is needed — each subdir is a valid scan root regardless.
 */
export function discoverPlugins(searchPaths: string[]): string[] {
  return searchPaths.flatMap((searchPath) => {
    const abs = nodePath.join(REPO_ROOT, searchPath);
    if (!existsSync(abs)) return [];
    return readdirSync(abs, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules')
      .map((e) => `${searchPath}/${e.name}`);
  });
}

// ---------------------------------------------------------------------------
// Shared context (loaded once, reused by all parallel workers)
// ---------------------------------------------------------------------------

export interface SharedContext {
  snapshotId: string;
  timestamp: string;
  reversedCodeowners: PathWithOwners[];
  matchRenovate: (dep: string) => RenovateMatch;
  declaredVersions: Map<string, string>;
  excludedDepPatterns: string[];
}

export function buildSharedContext(
  snapshotId: string,
  excludedDepPatterns: string[] = DEFAULT_EXCLUDED_DEPS
): SharedContext {
  const pkgPath = nodePath.join(REPO_ROOT, 'package.json');
  let declaredVersions = new Map<string, string>();
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    const all = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
    declaredVersions = new Map(Object.entries(all));
  } catch {
    // missing package.json — versions stay empty
  }

  return {
    snapshotId,
    timestamp: new Date(snapshotId).toISOString(),
    reversedCodeowners: getPathsWithOwnersReversed(),
    matchRenovate: buildRenovateMatcher(),
    declaredVersions,
    excludedDepPatterns,
  };
}

// ---------------------------------------------------------------------------
// Per-plugin doc building
// ---------------------------------------------------------------------------

const TEST_PATH_PATTERNS = [
  /\.test\.(ts|tsx)$/,
  /\.mock\.(ts|tsx)$/,
  /\.stories\.(ts|tsx)$/,
  /__fixtures__\//,
  /__mocks__\//,
  /\/test\//,
  /\/tests\//,
  /\.spec\.(ts|tsx)$/,
];

function isTestFile(filePath: string): boolean {
  return TEST_PATH_PATTERNS.some((p) => p.test(filePath));
}

/**
 * Default deps to drop at index time. Conventions:
 *   - trailing `/` → namespace prefix (e.g. "@elastic/" drops "@elastic/eui", "@elastic/ebt")
 *   - no `/`      → exact match     (e.g. "react" drops "react" but keeps "react-redux")
 *
 * `@elastic/` and `@kbn/` are our internal namespaces; `react` and `react-dom`
 * are the React core that every Kibana plugin transitively depends on (third-party
 * React-ecosystem packages like react-redux, react-router-dom, @testing-library/react
 * are intentionally still indexed).
 */
export const DEFAULT_EXCLUDED_DEPS = ['@elastic/', '@kbn/', 'react', 'react-dom'];

export function isExcludedDep(dep: string, patterns: string[]): boolean {
  return patterns.some((p) => (p.endsWith('/') ? dep.startsWith(p) : dep === p));
}

export interface DepUsageDoc {
  '@timestamp': string;
  snapshot_id: string;
  plugin_path: string;
  plugin_name: string;
  code_owners: string[];
  dep: string;
  dep_declared_version: string | null;
  dependent_file_count: number;
  dependent_test_file_count: number;
  dependent_prod_file_count: number;
  dependent_files: string[];
  renovate_match_team: string | null;
  renovate_match_group: string | null;
  renovate_orphan: boolean;
}

/** Run cruiser against a single plugin and return ready-to-index docs. */
export async function buildDocsForPlugin(
  pluginPath: string,
  ctx: SharedContext
): Promise<DepUsageDoc[]> {
  const result = await cruiseExternalDeps([pluginPath]);

  if (typeof result.output === 'string') {
    throw new Error('Unexpected string output from cruise');
  }

  const pluginName = pluginPath.split('/').pop() ?? pluginPath;
  const codeOwners = getCodeOwnersForFile(pluginPath, ctx.reversedCodeowners);
  const docs: DepUsageDoc[] = [];

  for (const mod of result.output.modules) {
    if (typeof mod.source !== 'string' || !mod.source.startsWith('node_modules/')) continue;

    const dep = mod.source.replace(/^node_modules\//, '');
    if (isExcludedDep(dep, ctx.excludedDepPatterns)) continue;

    const dependents = Array.from(
      new Set((mod.dependents ?? []).filter((f: string) => f.startsWith(pluginPath)))
    ).sort() as string[];

    if (dependents.length === 0) continue;
    const testFiles = dependents.filter(isTestFile);
    const renovate = ctx.matchRenovate(dep);

    docs.push({
      '@timestamp': ctx.timestamp,
      snapshot_id: ctx.snapshotId,
      plugin_path: pluginPath,
      plugin_name: pluginName,
      code_owners: codeOwners,
      dep,
      dep_declared_version: ctx.declaredVersions.get(dep) ?? null,
      dependent_file_count: dependents.length,
      dependent_test_file_count: testFiles.length,
      dependent_prod_file_count: dependents.length - testFiles.length,
      dependent_files: dependents,
      renovate_match_team: renovate.team,
      renovate_match_group: renovate.group,
      renovate_orphan: renovate.orphan,
    });
  }

  return docs;
}

// ---------------------------------------------------------------------------
// Elasticsearch helpers
// ---------------------------------------------------------------------------

export interface IndexerOptions {
  snapshotId: string;
  dryRun: boolean;
  esUrl: string;
  apiKey: string | null;
  indexName: string;
}

/** ES index template — PUT once with --setup-template.
 *  Shard/replica settings are intentionally omitted so the template works on
 *  both stateful and serverless clusters (serverless manages those itself). */
export const INDEX_TEMPLATE = {
  index_patterns: ['kibana-dependency-usage*'],
  priority: 100,
  template: {
    mappings: {
      properties: {
        '@timestamp': { type: 'date' },
        snapshot_id: { type: 'keyword' },
        plugin_path: { type: 'keyword' },
        plugin_name: { type: 'keyword' },
        code_owners: { type: 'keyword' },
        dep: { type: 'keyword' },
        dep_declared_version: { type: 'keyword' },
        dependent_file_count: { type: 'integer' },
        dependent_test_file_count: { type: 'integer' },
        dependent_prod_file_count: { type: 'integer' },
        dependent_files: { type: 'keyword' },
        renovate_match_team: { type: 'keyword' },
        renovate_match_group: { type: 'keyword' },
        renovate_orphan: { type: 'boolean' },
      },
    },
  },
};

function buildHeaders(opts: IndexerOptions): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.apiKey) headers['Authorization'] = `ApiKey ${opts.apiKey}`;
  return headers;
}

function buildBulkBody(docs: DepUsageDoc[]): string {
  return (
    docs
      .flatMap((doc) => [
        JSON.stringify({ index: { _id: `${doc.snapshot_id}::${doc.plugin_path}::${doc.dep}` } }),
        JSON.stringify(doc),
      ])
      .join('\n') + '\n'
  );
}

export async function ensureIndexTemplate(opts: IndexerOptions): Promise<void> {
  const url = `${opts.esUrl}/_index_template/kibana-dependency-usage-template`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: buildHeaders(opts),
    body: JSON.stringify(INDEX_TEMPLATE),
  });
  if (!res.ok) {
    throw new Error(`Failed to PUT index template (${res.status}): ${await res.text()}`);
  }
}

export async function indexDocs(docs: DepUsageDoc[], opts: IndexerOptions): Promise<void> {
  if (docs.length === 0) return;

  if (opts.dryRun) {
    process.stdout.write(buildBulkBody(docs));
    return;
  }

  const url = `${opts.esUrl}/${opts.indexName}/_bulk`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...buildHeaders(opts), 'Content-Type': 'application/x-ndjson' },
    body: buildBulkBody(docs),
  });

  if (!res.ok) {
    throw new Error(`Bulk index failed (${res.status}): ${await res.text()}`);
  }

  const json = (await res.json()) as { errors: boolean; items: unknown[] };
  if (json.errors) {
    const failed = (json.items as Array<{ index?: { error?: unknown } }>)
      .filter((i) => i.index?.error)
      .map((i) => i.index?.error);
    throw new Error(`Bulk index had errors:\n${JSON.stringify(failed, null, 2)}`);
  }
}
