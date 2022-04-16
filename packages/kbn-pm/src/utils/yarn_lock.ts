/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// @ts-expect-error published types are worthless
import { parse as parseLockfile } from '@yarnpkg/lockfile';

import { readFile } from './fs';
import { Kibana } from './kibana';
import { Project } from './project';
import { Log } from './log';

export interface YarnLock {
  /** a simple map of name@versionrange tags to metadata about a package */
  [key: string]: {
    /** resolved version installed for this pacakge */
    version: string;
    /** resolved url for this pacakge */
    resolved: string;
    /** yarn calculated integrity value for this package */
    integrity: string;
    dependencies?: {
      /** name => versionRange dependencies listed in package's manifest */
      [key: string]: string;
    };
    optionalDependencies?: {
      /** name => versionRange dependencies listed in package's manifest */
      [key: string]: string;
    };
  };
}

export async function readYarnLock(kbn: Kibana): Promise<YarnLock> {
  try {
    const contents = await readFile(kbn.getAbsolute('yarn.lock'), 'utf8');
    const yarnLock = parseLockfile(contents);

    if (yarnLock.type === 'success') {
      return yarnLock.object;
    }

    throw new Error('unable to read yarn.lock file, please run `yarn kbn bootstrap`');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  return {};
}

/**
 * Get a list of the absolute dependencies of this project, as resolved
 * in the yarn.lock file, does not include other projects in the workspace
 * or their dependencies
 */
export function resolveDepsForProject({
  project: rootProject,
  yarnLock,
  kbn,
  log,
  productionDepsOnly,
  includeDependentProject,
}: {
  project: Project;
  yarnLock: YarnLock;
  kbn: Kibana;
  log: Log;
  productionDepsOnly: boolean;
  includeDependentProject: boolean;
}) {
  /** map of [name@range, { name, version }] */
  const resolved = new Map<string, { name: string; version: string }>();

  const seenProjects = new Set<Project>();
  const projectQueue: Project[] = [rootProject];
  const depQueue: Array<[string, string]> = [];

  while (projectQueue.length) {
    const project = projectQueue.shift()!;
    if (seenProjects.has(project)) {
      continue;
    }
    seenProjects.add(project);

    const projectDeps = Object.entries(
      productionDepsOnly ? project.productionDependencies : project.allDependencies
    );
    for (const [name, versionRange] of projectDeps) {
      depQueue.push([name, versionRange]);
    }

    while (depQueue.length) {
      const [name, versionRange] = depQueue.shift()!;
      const req = `${name}@${versionRange}`;

      if (resolved.has(req)) {
        continue;
      }

      if (includeDependentProject && kbn.hasProject(name)) {
        projectQueue.push(kbn.getProject(name)!);
      }

      if (!kbn.hasProject(name)) {
        const pkg = yarnLock[req];
        if (!pkg) {
          log.warning(
            'yarn.lock file is out of date, please run `yarn kbn bootstrap` to re-enable caching'
          );
          return;
        }

        resolved.set(req, { name, version: pkg.version });

        const allDepsEntries = [
          ...Object.entries(pkg.dependencies || {}),
          ...Object.entries(pkg.optionalDependencies || {}),
        ];

        for (const [childName, childVersionRange] of allDepsEntries) {
          depQueue.push([childName, childVersionRange]);
        }
      }
    }
  }

  return resolved;
}
