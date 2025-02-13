/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import globby from 'globby';
import fs from 'fs';

import { run } from '@kbn/dev-cli-runner';

export function clearMissingImplicitDependencies() {
  return run(
    ({ flagsReader, log }) => {
      const dryRun = flagsReader.boolean('dry-run');

      const allProjectPaths = globby.sync('**/project.json', {
        cwd: process.cwd(),
        absolute: true,
        ignore: ['**/node_modules/**', 'bazel-*/**'],
      });

      const projects = allProjectPaths.reduce((projectMap, pathToProject) => {
        projectMap[pathToProject] = JSON.parse(fs.readFileSync(pathToProject, 'utf8'));
        return projectMap;
      }, {} as Record<string, any>);

      const projectNames = Object.values(projects).map((project: any) => project.name);

      Object.keys(projects).forEach((pathToProject) => {
        const project = projects[pathToProject];
        const missingDeps = (project.implicitDependencies || []).filter(
          (dep: string) => !projectNames.includes(dep)
        );
        if (missingDeps.length > 0) {
          log.info(
            `Removing missing implicit dependencies from ${pathToProject} [${missingDeps.join(
              ', '
            )}]`
          );
          project.implicitDependencies = project.implicitDependencies.filter((dep: string) =>
            projectNames.includes(dep)
          );
          if (!dryRun) {
            fs.writeFileSync(pathToProject, JSON.stringify(project, null, 2));
          }
        }
      });
    },
    {
      description: 'Clear missing implicit dependencies',
      flags: {
        boolean: ['dry-run'],
        help: `
          --dry-run
            Run the script without making any changes
            `,
      },
    }
  );
}

if (module.parent === null) {
  clearMissingImplicitDependencies().catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  });
}
