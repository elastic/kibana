/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import { kibanaPackageJson } from '@kbn/repo-info';

import type { PnpmLock } from './pnpm_lock';
import { snapshotKeyToNameVersion, toSnapshotKey } from './pnpm_lock';

/**
 * Get the set of all production dependencies for Kibana by starting with the
 * dependencies listed in package.json and traversing deeply into the transitive
 * dependencies as declared by pnpm-lock.yaml's snapshot graph.
 *
 * Returns a map of `name@version` -> { name, version }.
 */
export function findProductionDependencies(
  log: SomeDevLog,
  pnpmLock: PnpmLock,
  ignoreOptional = false
) {
  const resolved = new Map<string, { name: string; version: string }>();

  // seed the queue with the resolved snapshot keys of the root's production deps
  const queue: string[] = [];
  for (const [name, version] of Object.entries(kibanaPackageJson.dependencies)) {
    // ignore workspace deps to our own packages
    if (version.startsWith('workspace:') || version.startsWith('link:')) {
      continue;
    }
    const resolvedVersion = pnpmLock.rootDependencies[name]?.version;
    if (resolvedVersion) {
      // importer records the resolved version, which for `npm:` aliases is itself
      // a `name@version` snapshot key; compose it the same way as child deps.
      queue.push(toSnapshotKey(name, resolvedVersion));
    }
  }

  while (queue.length) {
    const snapshotKey = queue.shift()!;
    const { name, version } = snapshotKeyToNameVersion(snapshotKey);
    const key = `${name}@${version}`;

    if (resolved.has(key)) {
      continue;
    }

    const snapshot = pnpmLock.snapshots[snapshotKey];
    if (!snapshot) {
      log.warning(
        `pnpm-lock.yaml file is out of date (missing snapshot for "${snapshotKey}"), please re-run \`node scripts/kbn bootstrap\``
      );
      process.exit(1);
    }

    resolved.set(key, { name, version });

    const children = { ...snapshot.dependencies };
    if (!ignoreOptional) {
      Object.assign(children, snapshot.optionalDependencies);
    }
    for (const [childName, childValue] of Object.entries(children)) {
      queue.push(toSnapshotKey(childName, childValue));
    }
  }

  return resolved;
}
