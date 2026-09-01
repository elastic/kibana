/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fsp from 'fs/promises';
import Path from 'path';

import { parse as parseYaml } from 'yaml';
import { REPO_ROOT } from '@kbn/repo-info';

/**
 * Minimal, normalized view of a pnpm-lock.yaml (v9) file. We only model the bits
 * the validators and lockfile consumers need: the root importer's direct
 * dependencies and the resolved dependency graph (snapshots).
 */
export interface PnpmLock {
  /** root importer ('.') production deps: name -> specifier + resolved version */
  rootDependencies: Record<string, PnpmImporterDep>;
  /** root importer ('.') devDependencies: name -> specifier + resolved version */
  rootDevDependencies: Record<string, PnpmImporterDep>;
  /** snapshots: `name@version(peers)` -> resolved deps + optionalDeps (name -> version) */
  snapshots: Record<string, PnpmSnapshot>;
}

export interface PnpmImporterDep {
  specifier: string;
  /** resolved version; may carry a peer-dependency suffix */
  version: string;
}

export interface PnpmSnapshot {
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

/**
 * Simplified `name@version` graph derived from a parsed lock. Peer suffixes are
 * stripped and duplicate peer-resolved snapshots are merged.
 */
export interface PnpmLockGraph {
  /** root importer deps + devDeps: package name -> resolved version */
  rootVersions: Map<string, string>;
  /** `name@version` -> child `name@version` keys (deps + optionalDeps) */
  edges: Map<string, string[]>;
}

interface RawImporterDep {
  specifier: string;
  version: string;
}

interface RawPnpmLock {
  importers?: Record<
    string,
    {
      dependencies?: Record<string, RawImporterDep>;
      devDependencies?: Record<string, RawImporterDep>;
    }
  >;
  snapshots?: Record<string, RawPnpmSnapshot>;
}

interface RawPnpmSnapshot {
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

/** Parse pnpm-lock.yaml content into a normalized PnpmLock. */
export function parseLockfile(content: string): PnpmLock {
  const raw = parseYaml(content) as RawPnpmLock | undefined;
  if (!raw || typeof raw !== 'object') {
    throw new Error('unable to read pnpm-lock.yaml file, please run `node scripts/kbn bootstrap`');
  }

  const rootImporter = raw.importers?.['.'] ?? {};
  const snapshots: Record<string, PnpmSnapshot> = {};
  for (const [key, snap] of Object.entries(raw.snapshots ?? {})) {
    snapshots[key] = {
      dependencies: snap.dependencies,
      optionalDependencies: snap.optionalDependencies,
    };
  }

  return {
    rootDependencies: toImporterDeps(rootImporter.dependencies),
    rootDevDependencies: toImporterDeps(rootImporter.devDependencies),
    snapshots,
  };
}

export async function readPnpmLock(): Promise<PnpmLock> {
  try {
    const contents = await Fsp.readFile(Path.resolve(REPO_ROOT, 'pnpm-lock.yaml'), 'utf8');
    return parseLockfile(contents);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { rootDependencies: {}, rootDevDependencies: {}, snapshots: {} };
    }
    throw error;
  }
}

export function toLockGraph(lock: PnpmLock): PnpmLockGraph {
  const rootVersions = new Map<string, string>();
  for (const [name, dep] of Object.entries({
    ...lock.rootDependencies,
    ...lock.rootDevDependencies,
  })) {
    rootVersions.set(name, stripPeerSuffix(dep.version));
  }

  const edges = new Map<string, string[]>();
  for (const [snapshotKey, snapshot] of Object.entries(lock.snapshots)) {
    const { name, version } = snapshotKeyToNameVersion(snapshotKey);
    const selfKey = `${name}@${version}`;

    const children: string[] = [];
    const childValues = { ...snapshot.dependencies, ...snapshot.optionalDependencies };
    for (const [childName, childValue] of Object.entries(childValues)) {
      const childKey = toSnapshotKey(childName, childValue);
      const { name: cn, version: cv } = snapshotKeyToNameVersion(childKey);
      children.push(`${cn}@${cv}`);
    }

    const existing = edges.get(selfKey);
    edges.set(selfKey, existing ? Array.from(new Set([...existing, ...children])) : children);
  }

  return { rootVersions, edges };
}

/**
 * pnpm snapshot keys and importer versions can carry peer-dependency suffixes,
 * e.g. `@ai-sdk/langchain@1.0.190(zod@4.4.3)`. Strip them to recover the base
 * `name@version` identity. Handles scoped names and `npm:` aliases.
 */
export function snapshotKeyToNameVersion(key: string): { name: string; version: string } {
  const base = stripPeerSuffix(key);
  const at = base.startsWith('@') ? base.indexOf('@', 1) : base.indexOf('@');
  if (at === -1) {
    return { name: base, version: '' };
  }
  return { name: base.slice(0, at), version: base.slice(at + 1) };
}

/**
 * Compose the snapshot key used to look up a child dependency.
 * - plain: `lodash: 4.18.1` -> `lodash@4.18.1`
 * - peer-suffixed: `ai: 5.0.190(zod@4.4.3)` -> `ai@5.0.190(zod@4.4.3)`
 * - aliased: `ajv: '@redocly/ajv@8.18.1'` -> the value is already the key
 */
export function toSnapshotKey(name: string, value: string): string {
  const beforePeers = stripPeerSuffix(value);
  const aliasAt = beforePeers.startsWith('@')
    ? beforePeers.indexOf('@', 1)
    : beforePeers.indexOf('@');
  return aliasAt === -1 ? `${name}@${value}` : value;
}

export function stripPeerSuffix(key: string): string {
  const paren = key.indexOf('(');
  return paren === -1 ? key : key.slice(0, paren);
}

function toImporterDeps(
  raw: Record<string, RawImporterDep> | undefined
): Record<string, PnpmImporterDep> {
  const deps: Record<string, PnpmImporterDep> = {};
  for (const [name, dep] of Object.entries(raw ?? {})) {
    deps[name] = { specifier: dep.specifier, version: dep.version };
  }
  return deps;
}
