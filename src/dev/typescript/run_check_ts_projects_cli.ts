/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { run } from '@kbn/dev-cli-runner';
import { asyncMapWithLimit } from '@kbn/std';
import { getRepoFiles } from '@kbn/get-repo-files';
import globby from 'globby';

import { File } from '../file';
import { PROJECTS } from './projects';
import type { Project } from './project';

export async function runCheckTsProjectsCli() {
  run(
    async ({ log }) => {
      const filesAndProjects = await asyncMapWithLimit(PROJECTS, 5, async (proj) => {
        return {
          proj,
          files: (
            await globby(proj.getIncludePatterns(), {
              ignore: proj.getExcludePatterns(),
              cwd: proj.directory,
              onlyFiles: true,
              absolute: true,
            })
          ).map((p) => new File(p)),
        };
      });

      const isInMultipleTsProjects = new Map<string, Set<Project>>();
      const pathsToProject = new Map<string, Project>();
      for (const { proj, files } of filesAndProjects) {
        for (const file of files) {
          if (!pathsToProject.has(file.path)) {
            pathsToProject.set(file.path, proj);
            continue;
          }

          if (file.isTypescriptAmbient()) {
            // allow ambient .d.ts files to be in multiple projects
            continue;
          }

          isInMultipleTsProjects.set(
            file.path,
            new Set([...(isInMultipleTsProjects.get(file.path) ?? []), proj])
          );
        }
      }

      const isNotInTsProject: File[] = [];
      for (const { abs } of await getRepoFiles()) {
        const file = new File(abs);
        if (!file.isTypescript() || file.isFixture()) {
          continue;
        }

        if (!pathsToProject.has(file.getAbsolutePath())) {
          isNotInTsProject.push(file);
        }
      }

      if (!isNotInTsProject.length && !isInMultipleTsProjects.size) {
        log.success('All ts files belong to a single ts project');
        return;
      }

      if (isNotInTsProject.length) {
        log.error(
          `The following files do not belong to a tsconfig.json file, or that tsconfig.json file is not listed in src/dev/typescript/projects.ts\n${isNotInTsProject
            .map((file) => ` - ${file.getRelativePath()}`)
            .join('\n')}`
        );
      }

      if (isInMultipleTsProjects.size) {
        const details = Array.from(isInMultipleTsProjects)
          .map(
            ([path, projects]) =>
              ` - ${Path.relative(process.cwd(), path)}:\n${Array.from(projects)
                .map((p) => `   - ${Path.relative(process.cwd(), p.tsConfigPath)}`)
                .join('\n')}`
          )
          .join('\n');

        log.error(
          `The following files belong to multiple tsconfig.json files listed in src/dev/typescript/projects.ts\n${details}`
        );
      }

      process.exit(1);
    },
    {
      description:
        'Check that all .ts and .tsx files in the repository are assigned to a tsconfig.json file',
    }
  );
}
