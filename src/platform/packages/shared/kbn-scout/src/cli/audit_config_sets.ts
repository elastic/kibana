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
import { getPackages } from '@kbn/repo-packages';
import { snakeCase } from 'lodash';
import ts from 'typescript';
import type { ScoutServerConfig } from '../types';
import { loadRawServerConfig } from '../servers/configs/loader/read_config_file';

const CONFIG_SETS_DIR = 'src/platform/packages/shared/kbn-scout/src/servers/configs/config_sets';
const DEFAULT_SET = 'default';

/** Config keys core lets tests change at runtime through `/internal/core/_settings`. */
const CORE_RUNTIME_KEYS = ['feature_flags.overrides'];

export type ConfigSetFlavor = 'stateful' | 'serverless';

export interface ConfigSetOverrides {
  /** Config set directory name, e.g. `session_idle`. */
  name: string;
  flavor: ConfigSetFlavor;
  /** Config file name, e.g. `classic.stateful.config.ts`, which also identifies the default it is compared to. */
  file: string;
  /** Kibana `serverArgs` that differ from the default set, key to value (`<removed>` when the set drops a default arg). */
  kibana: Record<string, string>;
  /** Elasticsearch `serverArgs` that differ from the default set, key to value (`<removed>` when the set drops a default arg). */
  elasticsearch: Record<string, string>;
  /** Dotted paths of every other field that differs from the default (license, files, env, servers, ...). */
  other: string[];
}

export const REMOVED = '<removed>';

export interface ConfigSetsReport {
  sets: ConfigSetOverrides[];
  /** Config files that could not be loaded, with the error. The rest of the report is still valid. */
  failed: Array<{ file: string; error: string }>;
  /** Sets with no difference from the default at all. */
  sameAsDefault: string[];
  /** Sets whose every difference from the default is a runtime updatable Kibana setting. */
  runtimeOnly: string[];
  /** Sets (same flavor and file) with identical, non empty differences from the default. */
  identical: string[][];
  /** Sets whose differences are a strict subset of another set's. */
  subsets: Array<{ set: string; of: string }>;
  /** The runtime updatable keys the check used. */
  runtimeKeys: string[];
}

/**
 * `--a.b=c` or `a.b=c` to `[a.b, c]`. Repeated keys are joined so ordering does
 * not matter. Long digit runs (timestamps in generated file names) are masked so
 * two boots of the same set compare equal.
 */
export function parseServerArgs(args: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const arg of args) {
    const match = /^(?:--)?([^=]+)=(.*)$/s.exec(String(arg));
    if (!match) continue;
    const [, key, raw] = match;
    const value = raw.replace(/\d{10,}/g, '<n>');
    out[key] = key in out ? `${out[key]},${value}` : value;
  }
  return out;
}

/** Keys added or changed in `actual`, plus keys of `base` that `actual` dropped (as `<removed>`). */
export function diffArgs(
  actual: Record<string, string>,
  base: Record<string, string>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(actual)) {
    if (base[key] !== value) out[key] = value;
  }
  for (const key of Object.keys(base)) {
    if (!(key in actual)) out[key] = REMOVED;
  }
  return out;
}

const SERVER_ARG_PATHS = new Set(['kbnTestServer.serverArgs', 'esTestCluster.serverArgs']);

const flatten = (value: unknown, prefix = '', out: Record<string, string> = {}) => {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      flatten(v, prefix ? `${prefix}.${k}` : k, out);
    }
  } else if (!SERVER_ARG_PATHS.has(prefix)) {
    out[prefix] = (JSON.stringify(value) ?? 'undefined').replace(/\d{10,}/g, '<n>');
  }
  return out;
};

/** Dotted paths of every field outside the server args where the set and the default differ. */
export function otherDifferences(set: ScoutServerConfig, base: ScoutServerConfig): string[] {
  const a = flatten(set);
  const b = flatten(base);
  return [...new Set([...Object.keys(a), ...Object.keys(b)])]
    .filter((path) => a[path] !== b[path])
    .sort();
}

/** `true` when `key` equals a runtime key or sits under one (`feature_flags.overrides.x`). */
export function isRuntimeUpdatable(key: string, runtimeKeys: readonly string[]): boolean {
  return runtimeKeys.some((runtime) => key === runtime || key.startsWith(`${runtime}.`));
}

const flattenTrueKeys = (node: ts.ObjectLiteralExpression, prefix: string[]): string[] =>
  node.properties.flatMap((prop) => {
    if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) return [];
    const path = [...prefix, prop.name.text];
    if (prop.initializer.kind === ts.SyntaxKind.TrueKeyword) return [path.join('.')];
    if (ts.isObjectLiteralExpression(prop.initializer))
      return flattenTrueKeys(prop.initializer, path);
    return [];
  });

/**
 * Config keys plugins mark as runtime updatable with `dynamicConfig` in their
 * config descriptor, prefixed with the plugin's config path, plus core's own.
 * Read from source so the list follows the plugins, not a hand list here.
 */
export function findRuntimeUpdatableKeys(repoRoot: string): string[] {
  const keys = [...CORE_RUNTIME_KEYS];

  for (const pkg of getPackages(repoRoot)) {
    const { plugin } = pkg.manifest as { plugin?: { id: string; configPath?: string | string[] } };
    if (!plugin) continue;
    // `pkg.directory` is already absolute.
    const serverDir = Path.join(pkg.directory, 'server');
    if (!Fs.existsSync(serverDir)) continue;

    const configPath = Array.isArray(plugin.configPath)
      ? plugin.configPath.join('.')
      : plugin.configPath ?? snakeCase(plugin.id); // Kibana's own default for a missing configPath

    for (const file of listConfigSourceFiles(serverDir)) {
      const text = Fs.readFileSync(file, 'utf8');
      if (!text.includes('dynamicConfig')) continue;
      const source = ts.createSourceFile(
        file,
        text,
        ts.ScriptTarget.Latest,
        false,
        ts.ScriptKind.TS
      );
      const visit = (node: ts.Node) => {
        if (
          ts.isPropertyAssignment(node) &&
          ts.isIdentifier(node.name) &&
          node.name.text === 'dynamicConfig' &&
          ts.isObjectLiteralExpression(node.initializer)
        ) {
          keys.push(...flattenTrueKeys(node.initializer, [configPath]));
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
  }

  return [...new Set(keys)].sort();
}

// Plugin config descriptors live in `server/config.ts` or `server/config/*.ts`.
function listConfigSourceFiles(serverDir: string): string[] {
  const direct = Path.join(serverDir, 'config.ts');
  const nested = Path.join(serverDir, 'config');
  const files = Fs.existsSync(direct) ? [direct] : [];
  if (Fs.existsSync(nested) && Fs.statSync(nested).isDirectory()) {
    files.push(
      ...Fs.readdirSync(nested)
        .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
        .map((f) => Path.join(nested, f))
    );
  }
  return files;
}

interface ConfigSetFile {
  name: string;
  flavor: ConfigSetFlavor;
  file: string;
  path: string;
}

/** Every loadable `*.config.ts` in the non default config sets, with its flavor. */
export function listConfigSetFiles(repoRoot: string): ConfigSetFile[] {
  const root = Path.join(repoRoot, CONFIG_SETS_DIR);
  const out: ConfigSetFile[] = [];
  for (const name of Fs.readdirSync(root)) {
    if (name === DEFAULT_SET || !Fs.statSync(Path.join(root, name)).isDirectory()) continue;
    for (const flavor of ['stateful', 'serverless'] as const) {
      const dir = Path.join(root, name, flavor);
      if (!Fs.existsSync(dir)) continue;
      for (const file of Fs.readdirSync(dir)) {
        // `base.config.ts` files are building blocks other configs import, not bootable sets.
        if (!file.endsWith('.config.ts') || file === 'base.config.ts') continue;
        out.push({ name, flavor, file, path: Path.join(dir, file) });
      }
    }
  }
  return out;
}

/** Compares every config set against the default set of the same flavor and file. */
export async function auditConfigSets(repoRoot: string): Promise<ConfigSetsReport> {
  const runtimeKeys = findRuntimeUpdatableKeys(repoRoot);
  const defaults = new Map<string, ScoutServerConfig>();
  const loadDefault = async (flavor: ConfigSetFlavor, file: string) => {
    const key = `${flavor}/${file}`;
    if (!defaults.has(key)) {
      defaults.set(
        key,
        await loadRawServerConfig(Path.join(repoRoot, CONFIG_SETS_DIR, DEFAULT_SET, flavor, file))
      );
    }
    return defaults.get(key) as ScoutServerConfig;
  };

  const sets: ConfigSetOverrides[] = [];
  const failed: ConfigSetsReport['failed'] = [];
  for (const entry of listConfigSetFiles(repoRoot)) {
    let set: ScoutServerConfig;
    let base: ScoutServerConfig;
    try {
      [set, base] = await Promise.all([
        loadRawServerConfig(entry.path),
        loadDefault(entry.flavor, entry.file),
      ]);
    } catch (error) {
      // One broken or unusual set must not hide the rest of the report.
      failed.push({ file: Path.relative(repoRoot, entry.path), error: String(error) });
      continue;
    }
    sets.push({
      name: entry.name,
      flavor: entry.flavor,
      file: entry.file,
      kibana: diffArgs(
        parseServerArgs(set.kbnTestServer?.serverArgs ?? []),
        parseServerArgs(base.kbnTestServer?.serverArgs ?? [])
      ),
      elasticsearch: diffArgs(
        parseServerArgs(set.esTestCluster?.serverArgs ?? []),
        parseServerArgs(base.esTestCluster?.serverArgs ?? [])
      ),
      other: otherDifferences(set, base),
    });
  }

  return { ...summarizeConfigSets(sets, runtimeKeys), failed };
}

// `session_idle (stateful)` or `uiam_local (serverless/security_complete)`: the file
// name only carries information for serverless, where each domain has its own config.
const label = (s: ConfigSetOverrides) =>
  s.flavor === 'stateful'
    ? `${s.name} (stateful)`
    : `${s.name} (serverless/${s.file.replace('.serverless.config.ts', '')})`;
const signature = (s: ConfigSetOverrides) =>
  JSON.stringify([s.flavor, s.file, sortEntries(s.kibana), sortEntries(s.elasticsearch), s.other]);
const sortEntries = (record: Record<string, string>) => Object.entries(record).sort();
const isSubset = (a: Record<string, string>, b: Record<string, string>) =>
  Object.entries(a).every(([k, v]) => b[k] === v);

/** Pure grouping over already computed overrides, so it is unit testable without loading configs. */
export function summarizeConfigSets(
  sets: ConfigSetOverrides[],
  runtimeKeys: string[]
): ConfigSetsReport {
  const isEmpty = (s: ConfigSetOverrides) =>
    Object.keys(s.kibana).length === 0 &&
    Object.keys(s.elasticsearch).length === 0 &&
    s.other.length === 0;
  const sameAsDefault = sets.filter(isEmpty).map(label);

  const runtimeOnly = sets
    .filter(
      (s) =>
        Object.keys(s.kibana).length > 0 &&
        Object.keys(s.elasticsearch).length === 0 &&
        s.other.length === 0 &&
        Object.keys(s.kibana).every((k) => isRuntimeUpdatable(k, runtimeKeys))
    )
    .map(label);

  const bySignature = new Map<string, ConfigSetOverrides[]>();
  for (const s of sets.filter((x) => !isEmpty(x))) {
    const sig = signature(s);
    bySignature.set(sig, [...(bySignature.get(sig) ?? []), s]);
  }
  const identical = [...bySignature.values()]
    .filter((group) => group.length > 1)
    .map((group) => group.map(label).sort());

  // One representative per identical group, so twins do not repeat each other's lines.
  const representatives = [...bySignature.values()].map((group) => group[0]);
  const covers = (a: ConfigSetOverrides, b: ConfigSetOverrides) =>
    a !== b &&
    a.flavor === b.flavor &&
    a.file === b.file &&
    signature(a) !== signature(b) &&
    isSubset(a.kibana, b.kibana) &&
    isSubset(a.elasticsearch, b.elasticsearch);

  const subsets: Array<{ set: string; of: string }> = [];
  for (const a of representatives) {
    const aSize = Object.keys(a.kibana).length + Object.keys(a.elasticsearch).length;
    // Only plain arg-level supersets: a set that also needs docker, a license or
    // preboot is not a merge target for one that does not.
    if (aSize === 0 || a.other.length > 0) continue;
    const supersets = representatives.filter((b) => b.other.length === 0 && covers(a, b));
    // Nearest supersets only: if A ⊆ B ⊆ C, listing C under A adds nothing.
    const nearest = supersets.filter((b) => !supersets.some((c) => c !== b && covers(c, b)));
    for (const b of nearest) subsets.push({ set: label(a), of: label(b) });
  }

  return { sets, failed: [], sameAsDefault, runtimeOnly, identical, subsets, runtimeKeys };
}
