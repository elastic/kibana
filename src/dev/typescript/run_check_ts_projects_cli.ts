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
import { createFailError } from '@kbn/dev-cli-errors';
import { getRepoFiles } from '@kbn/get-repo-files';
import globby from 'globby';

import { File } from '../file';
import { PROJECTS } from './projects';
import type { Project } from './project';

class Stats {
  counts = {
    files: new Map<Project, number>(),
    ignored: new Map<Project, number>(),
    gitMatched: new Map<Project, number>(),
  };

  incr(proj: Project, metric: 'files' | 'ignored' | 'gitMatched', delta = 1) {
    const cur = this.counts[metric].get(proj);
    this.counts[metric].set(proj, (cur ?? 0) + delta);
  }
}

export async function runCheckTsProjectsCli() {
  run(
    async ({ log }) => {
      const stats = new Stats();
      let failed = false;

      const pathsAndProjects = await asyncMapWithLimit(PROJECTS, 5, async (proj) => {
        const paths = await globby(proj.getIncludePatterns(), {
          ignore: proj.getExcludePatterns(),
          cwd: proj.directory,
          onlyFiles: true,
          absolute: true,
        });
        stats.incr(proj, 'files', paths.length);
        return {
          proj,
          paths,
        };
      });

      const isInMultipleTsProjects = new Map<string, Set<Project>>();
      const pathsToProject = new Map<string, Project>();
      for (const { proj, paths } of pathsAndProjects) {
        for (const path of paths) {
          if (!pathsToProject.has(path)) {
            pathsToProject.set(path, proj);
            continue;
          }

          if (path.endsWith('.d.ts')) {
            stats.incr(proj, 'ignored');
            continue;
          }

          isInMultipleTsProjects.set(
            path,
            new Set([...(isInMultipleTsProjects.get(path) ?? []), proj])
          );
        }
      }

      if (isInMultipleTsProjects.size) {
        failed = true;
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

      const isNotInTsProject: File[] = [];
      for (const { abs } of await getRepoFiles()) {
        const file = new File(abs);
        if (!file.isTypescript() || file.isFixture()) {
          continue;
        }

        const proj = pathsToProject.get(file.getAbsolutePath());
        if (proj === undefined) {
          isNotInTsProject.push(file);
        } else {
          stats.incr(proj, 'gitMatched');
        }
      }

      if (isNotInTsProject.length) {
        failed = true;
        log.error(
          `The following files do not belong to a tsconfig.json file, or that tsconfig.json file is not listed in src/dev/typescript/projects.ts\n${isNotInTsProject
            .map((file) => ` - ${file.getRelativePath()}`)
            .join('\n')}`
        );
      }

      for (const [metric, counts] of Object.entries(stats.counts)) {
        log.verbose('metric:', metric);
        for (const [proj, count] of Array.from(counts).sort((a, b) =>
          a[0].name.localeCompare(b[0].name)
        )) {
          log.verbose('  ', proj.name, count);
        }
      }

      if (failed) {
        throw createFailError('see above errors');
      } else {
        log.success('All ts files belong to a single ts project');
      }
    },
    {
      description:
        'Check that all .ts and .tsx files in the repository are assigned to a tsconfig.json file',
    }
  );
}
