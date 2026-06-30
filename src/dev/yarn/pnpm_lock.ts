/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse as parseYaml } from 'yaml';

/**
 * A simplified dependency graph extracted from a pnpm-lock.yaml (v9) file, keyed
 * by `name@version` (peer suffixes stripped) so callers can resolve and traverse
 * dependency versions without re-implementing pnpm lockfile parsing.
 */
export interface PnpmLockGraph {
  /** root importer ('.') deps: package name -> resolved version (peer suffix stripped) */
  rootVersions: Map<string, string>;
  /** `name@version` -> child `name@version` keys (deps + optionalDeps) */
  edges: Map<string, string[]>;
}

interface RawImporterDep {
  specifier: string;
  version: string;
}

interface RawSnapshot {
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

interface RawImporter {
  dependencies?: Record<string, RawImporterDep>;
  devDependencies?: Record<string, RawImporterDep>;
}

interface RawPnpmLock {
  importers?: Record<string, RawImporter>;
  snapshots?: Record<string, RawSnapshot>;
}

export const parsePnpmLock = (content: string): PnpmLockGraph => {
  const raw = (parseYaml(content) ?? {}) as RawPnpmLock;

  const rootImporter = raw.importers?.['.'] ?? {};
  const rootVersions = new Map<string, string>();
  for (const [name, dep] of Object.entries({
    ...rootImporter.dependencies,
    ...rootImporter.devDependencies,
  })) {
    rootVersions.set(name, stripPeerSuffix(dep.version));
  }

  const edges = new Map<string, string[]>();
  for (const [snapshotKey, snapshot] of Object.entries(raw.snapshots ?? {})) {
    const { name, version } = parseKey(snapshotKey);
    const selfKey = `${name}@${version}`;

    const children: string[] = [];
    const childValues = { ...snapshot.dependencies, ...snapshot.optionalDependencies };
    for (const [childName, childValue] of Object.entries(childValues)) {
      const childKey = toChildKey(childName, childValue);
      const { name: cn, version: cv } = parseKey(childKey);
      children.push(`${cn}@${cv}`);
    }

    // a package may appear under multiple peer-resolved snapshot keys; merge edges
    const existing = edges.get(selfKey);
    edges.set(selfKey, existing ? Array.from(new Set([...existing, ...children])) : children);
  }

  return { rootVersions, edges };
};

const toChildKey = (name: string, value: string): string => {
  const beforePeers = stripPeerSuffix(value);
  const aliasAt = beforePeers.startsWith('@')
    ? beforePeers.indexOf('@', 1)
    : beforePeers.indexOf('@');
  return aliasAt === -1 ? `${name}@${value}` : value;
};

const parseKey = (key: string): { name: string; version: string } => {
  const base = stripPeerSuffix(key);
  const at = base.startsWith('@') ? base.indexOf('@', 1) : base.indexOf('@');
  return at === -1
    ? { name: base, version: '' }
    : { name: base.slice(0, at), version: base.slice(at + 1) };
};

const stripPeerSuffix = (value: string): string => {
  const paren = value.indexOf('(');
  return paren === -1 ? value : value.slice(0, paren);
};
