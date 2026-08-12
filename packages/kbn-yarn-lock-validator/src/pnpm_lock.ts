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
 * the validators need: the root importer's direct dependencies and the resolved
 * dependency graph (snapshots).
 */
export interface PnpmLock {
  /** root importer ('.') direct deps: name -> resolved snapshot key (may carry peer suffixes) */
  rootDependencies: Record<string, string>;
  /** snapshots: `name@version(peers)` -> resolved deps + optionalDeps (name -> version) */
  snapshots: Record<string, PnpmSnapshot>;
}

export interface PnpmSnapshot {
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

interface RawImporterDep {
  specifier: string;
  version: string;
}

interface RawPnpmLock {
  importers?: Record<string, { dependencies?: Record<string, RawImporterDep> }>;
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
  const rootDependencies: Record<string, string> = {};
  for (const [name, dep] of Object.entries(rootImporter.dependencies ?? {})) {
    rootDependencies[name] = dep.version;
  }

  const snapshots: Record<string, PnpmSnapshot> = {};
  for (const [key, snap] of Object.entries(raw.snapshots ?? {})) {
    snapshots[key] = {
      dependencies: snap.dependencies,
      optionalDependencies: snap.optionalDependencies,
    };
  }

  return { rootDependencies, snapshots };
}

export async function readPnpmLock(): Promise<PnpmLock> {
  try {
    const contents = await Fsp.readFile(Path.resolve(REPO_ROOT, 'pnpm-lock.yaml'), 'utf8');
    return parseLockfile(contents);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { rootDependencies: {}, snapshots: {} };
    }
    throw error;
  }
}

/**
 * pnpm snapshot keys and importer versions can carry peer-dependency suffixes,
 * e.g. `@ai-sdk/langchain@1.0.190(zod@4.4.3)`. Strip them to recover the base
 * `name@version` identity. Handles scoped names and `npm:` aliases.
 */
export function snapshotKeyToNameVersion(key: string): { name: string; version: string } {
  // drop peer suffixes: everything after the first top-level "("
  const base = stripPeerSuffix(key);
  const at = base.startsWith('@') ? base.indexOf('@', 1) : base.indexOf('@');
  if (at === -1) {
    return { name: base, version: '' };
  }
  return { name: base.slice(0, at), version: base.slice(at + 1) };
}

function stripPeerSuffix(key: string): string {
  const paren = key.indexOf('(');
  return paren === -1 ? key : key.slice(0, paren);
}
