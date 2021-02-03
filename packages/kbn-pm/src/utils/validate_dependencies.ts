/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

// @ts-expect-error published types are useless
import { stringify as stringifyLockfile } from '@yarnpkg/lockfile';
import dedent from 'dedent';
import chalk from 'chalk';
import { sep } from 'path';

import { writeFile } from './fs';
import { Kibana } from './kibana';
import { YarnLock } from './yarn_lock';
import { log } from './log';
import { Project } from './project';
import { isLinkDependency } from './package_json';
import { ITree, treeToString } from './projects_tree';

export async function validateDependencies(kbn: Kibana, yarnLock: YarnLock) {
  // look through all of the packages in the yarn.lock file to see if
  // we have accidentally installed multiple lodash v4 versions
  const lodash4Versions = new Set<string>();
  const lodash4Reqs = new Set<string>();
  for (const [req, dep] of Object.entries(yarnLock)) {
    if (req.startsWith('lodash@') && dep.version.startsWith('4.')) {
      lodash4Reqs.add(req);
      lodash4Versions.add(dep.version);
    }
  }

  // if we find more than one lodash v4 version installed then delete
  // lodash v4 requests from the yarn.lock file and prompt the user to
  // retry bootstrap so that a single v4 version will be installed
  if (lodash4Versions.size > 1) {
    for (const req of lodash4Reqs) {
      delete yarnLock[req];
    }

    await writeFile(kbn.getAbsolute('yarn.lock'), stringifyLockfile(yarnLock), 'utf8');

    log.error(dedent`

      Multiple version of lodash v4 were detected, so they have been removed
      from the yarn.lock file. Please rerun yarn kbn bootstrap to coalese the
      lodash versions installed.

      If you still see this error when you re-bootstrap then you might need
      to force a new dependency to use the latest version of lodash via the
      "resolutions" field in package.json.

      If you have questions about this please reach out to the operations team.

    `);

    process.exit(1);
  }

  // look through all the dependencies of production packages and production
  // dependencies of those packages to determine if we're shipping any versions
  // of lodash v3 in the distributable
  const prodDependencies = kbn.resolveAllProductionDependencies(yarnLock, log);
  const lodash3Versions = new Set<string>();
  for (const dep of prodDependencies.values()) {
    if (dep.name === 'lodash' && dep.version.startsWith('3.')) {
      lodash3Versions.add(dep.version);
    }
  }

  // if any lodash v3 packages were found we abort and tell the user to fix things
  if (lodash3Versions.size) {
    log.error(dedent`

      Due to changes in the yarn.lock file and/or package.json files a version of
      lodash 3 is now included in the production dependencies. To reduce the size of
      our distributable and especially our front-end bundles we have decided to
      prevent adding any new instances of lodash 3.

      Please inspect the changes to yarn.lock or package.json files to identify where
      the lodash 3 version is coming from and remove it.

      If you have questions about this please reack out to the operations team.

    `);

    process.exit(1);
  }

  // TODO: remove this once we move into a single package.json
  // look through all the package.json files to find packages which have mismatched version ranges
  const depRanges = new Map<string, Array<{ range: string; projects: Project[] }>>();
  for (const project of kbn.getAllProjects().values()) {
    // Skip if this is an external plugin
    if (project.path.includes(`${kbn.kibanaProject?.path}${sep}plugins`)) {
      continue;
    }

    for (const [dep, range] of Object.entries(project.allDependencies)) {
      const existingDep = depRanges.get(dep);
      if (!existingDep) {
        depRanges.set(dep, [
          {
            range,
            projects: [project],
          },
        ]);
        continue;
      }

      const existingRange = existingDep.find((existing) => existing.range === range);
      if (!existingRange) {
        existingDep.push({
          range,
          projects: [project],
        });
        continue;
      }

      existingRange.projects.push(project);
    }
  }

  const duplicateRanges = Array.from(depRanges.entries())
    .filter(
      ([, ranges]) => ranges.length > 1 && !ranges.every((rng) => isLinkDependency(rng.range))
    )
    .reduce(
      (acc: string[], [dep, ranges]) => [
        ...acc,
        dep,
        ...ranges.map(
          ({ range, projects }) => `  ${range} => ${projects.map((p) => p.name).join(', ')}`
        ),
      ],
      []
    )
    .join('\n        ');

  if (duplicateRanges) {
    log.error(dedent`

      [single_version_dependencies] Multiple version ranges for the same dependency
      were found declared across different package.json files. Please consolidate
      those to match across all package.json files. Different versions for the
      same dependency is not supported.

      If you have questions about this please reach out to the operations team.

      The conflicting dependencies are:

        ${duplicateRanges}
    `);

    process.exit(1);
  }

  // look for packages that have the the `kibana.devOnly` flag in their package.json
  // and make sure they aren't included in the production dependencies of Kibana
  const devOnlyProjectsInProduction = getDevOnlyProductionDepsTree(kbn, 'kibana');
  if (devOnlyProjectsInProduction) {
    log.error(dedent`
      Some of the packages in the production dependency chain for Kibana and X-Pack are
      flagged with "kibana.devOnly" in their package.json. Please check changes made to
      packages and their dependencies to ensure they don't end up in production.

      The devOnly dependencies that are being dependend on in production are:

        ${treeToString(devOnlyProjectsInProduction).split('\n').join('\n        ')}
    `);

    process.exit(1);
  }

  log.success('yarn.lock analysis completed without any issues');
}

function getDevOnlyProductionDepsTree(kbn: Kibana, projectName: string) {
  const project = kbn.getProject(projectName);
  const childProjectNames = [
    ...Object.keys(project.productionDependencies).filter((name) => kbn.hasProject(name)),
    ...(projectName === 'kibana' ? ['x-pack'] : []),
  ];

  const children = childProjectNames
    .map((n) => getDevOnlyProductionDepsTree(kbn, n))
    .filter((t): t is ITree => !!t);

  if (!children.length && !project.isFlaggedAsDevOnly()) {
    return;
  }

  const tree: ITree = {
    name: project.isFlaggedAsDevOnly() ? chalk.red.bold(projectName) : projectName,
    children,
  };

  return tree;
}
