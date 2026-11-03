/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isDeepStrictEqual } from 'util';
import { readFileSync, writeFileSync } from 'fs';
import { parseAllDocuments } from 'yaml';

interface LockfilePackage {
  deprecated?: string;
}

interface Lockfile {
  packages: Record<string, LockfilePackage>;
}

export interface LockfileChange {
  kind: 'unchanged' | 'informational' | 'material';
  deprecatedPackages: string[];
}

function parseWithoutDeprecations(contents: string): {
  lockfiles: Lockfile[];
  deprecations: Array<Map<string, string>>;
} {
  const documents = parseAllDocuments(contents);
  if (documents.length === 0) {
    throw new Error('pnpm-lock.yaml is empty');
  }

  const lockfiles: Lockfile[] = [];
  const deprecations: Array<Map<string, string>> = [];
  for (const document of documents) {
    if (document.errors.length > 0) {
      throw document.errors[0];
    }
    const lockfile = document.toJS() as Lockfile;
    if (
      !lockfile ||
      typeof lockfile !== 'object' ||
      !lockfile.packages ||
      typeof lockfile.packages !== 'object' ||
      Array.isArray(lockfile.packages)
    ) {
      throw new Error('pnpm-lock.yaml has a document without a packages mapping');
    }

    const documentDeprecations = new Map<string, string>();
    for (const [name, details] of Object.entries(lockfile.packages)) {
      if (!details || typeof details !== 'object' || Array.isArray(details)) {
        throw new Error(`Invalid package entry in pnpm-lock.yaml: ${name}`);
      }
      if (details.deprecated !== undefined) {
        if (typeof details.deprecated !== 'string') {
          throw new Error(`Invalid deprecation notice in pnpm-lock.yaml: ${name}`);
        }
        documentDeprecations.set(name, details.deprecated);
        delete details.deprecated;
      }
    }
    lockfiles.push(lockfile);
    deprecations.push(documentDeprecations);
  }

  return { lockfiles, deprecations };
}

/** Classify a pnpm lockfile rewrite while ignoring package deprecation notices. */
export function classifyLockfileChange(before: string, after: string): LockfileChange {
  if (before === after) {
    return { kind: 'unchanged', deprecatedPackages: [] };
  }

  const previous = parseWithoutDeprecations(before);
  const current = parseWithoutDeprecations(after);
  if (!isDeepStrictEqual(previous.lockfiles, current.lockfiles)) {
    return { kind: 'material', deprecatedPackages: [] };
  }

  const deprecatedPackages = new Set<string>();
  previous.deprecations.forEach((previousNotices, index) => {
    const currentNotices = current.deprecations[index];
    const names = new Set([...previousNotices.keys(), ...currentNotices.keys()]);
    for (const name of names) {
      if (previousNotices.get(name) !== currentNotices.get(name)) {
        deprecatedPackages.add(name);
      }
    }
  });

  return { kind: 'informational', deprecatedPackages: [...deprecatedPackages].sort() };
}

/** Restore the original bytes when dedupe changed only deprecation notices or formatting. */
export function reconcileLockfile(path: string, before: string): LockfileChange {
  const change = classifyLockfileChange(before, readFileSync(path, 'utf8'));
  if (change.kind === 'informational') {
    writeFileSync(path, before);
  }
  return change;
}
