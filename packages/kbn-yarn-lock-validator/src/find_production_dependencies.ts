/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SomeDevLog } from '@kbn/some-dev-log';
import { kibanaPackageJson } from '@kbn/repo-info';

import { YarnLock } from './yarn_lock';

/**
 * Get a list of the all production dependencies for Kibana by starting with the
 * dependencies listed in package.json and then traversing deeply into the transitive
 * dependencies as declared by the yarn.lock file.
 */
export function findProductionDependencies(log: SomeDevLog, yarnLock: YarnLock) {
  const resolved = new Map<string, { name: string; version: string }>();

  // queue of dependencies entries, we will add the transitive dependencies to
  // this queue as we itterate
  const depQueue = Object.entries(kibanaPackageJson.dependencies);

  for (const [name, versionRange] of depQueue) {
    const key = `${name}@${versionRange}`;

    // ignore `link:` deps to our own packages and deps we have already seen
    if (resolved.has(key) || versionRange.startsWith('link:')) {
      continue;
    }

    const pkg = yarnLock[key];
    if (!pkg) {
      log.warning('yarn.lock file is out of date, please re-run `yarn kbn bootstrap`');
      process.exit(1);
    }

    resolved.set(key, { name, version: pkg.version });

    const allDepsEntries = [
      ...Object.entries(pkg.dependencies || {}),
      ...Object.entries(pkg.optionalDependencies || {}),
    ];

    for (const [childName, childVersionRange] of allDepsEntries) {
      depQueue.push([childName, childVersionRange]);
    }
  }

  return resolved;
}
