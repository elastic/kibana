/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';
import { RepoPath } from '@kbn/repo-path';
import { getRepoFiles } from '@kbn/get-repo-files';
import { PROJECTS as ALL_PROJECTS, type Project } from '@kbn/ts-projects';
import { lintProjects, ProjectFileMap } from '@kbn/ts-project-linter';

run(
  async ({ log, flagsReader }) => {
    const projectFilter = new Set(
      flagsReader.arrayOfStrings('project')?.map((i) => Path.resolve(i))
    );
    const projects = projectFilter.size
      ? ALL_PROJECTS.filter((p) => projectFilter.has(p.path))
      : ALL_PROJECTS;

    const projectFileMap = new ProjectFileMap();
    await projectFileMap.preload(ALL_PROJECTS);

    const { lintingErrorCount } = await lintProjects(log, projects, {
      fix: flagsReader.boolean('fix'),
      projectFileMap,
      skipRefs:
        flagsReader.boolean('refs-check') === false ||
        flagsReader.boolean('no-refs-check') === true,
    });

    let failed = lintingErrorCount > 0;

    const isInMultipleTsProjects = new Map<string, Set<Project>>();
    const pathsToProject = new Map<string, Project>();
    for (const proj of ALL_PROJECTS) {
      const paths = projectFileMap.getFiles(proj);

      for (const path of paths) {
        if (!pathsToProject.has(path.repoRel)) {
          pathsToProject.set(path.repoRel, proj);
          continue;
        }

        if (path.isTypeScriptAmbient()) {
          continue;
        }

        isInMultipleTsProjects.set(
          path.repoRel,
          new Set([...(isInMultipleTsProjects.get(path.repoRel) ?? []), proj])
        );
      }
    }

    if (isInMultipleTsProjects.size) {
      failed = true;
      const details = Array.from(isInMultipleTsProjects)
        .map(
          ([repoRel, list]) =>
            ` - ${repoRel}:\n${Array.from(list)
              .map((p) => `   - ${p.repoRel}`)
              .join('\n')}`
        )
        .join('\n');

      log.error(
        `The following files belong to multiple tsconfig.json files listed in packages/kbn-ts-projects/projects.ts\n${details}`
      );
    }

    const isNotInTsProject: RepoPath[] = [];
    for (const path of await getRepoFiles()) {
      if (!path.isTypeScript() || path.isFixture()) {
        continue;
      }

      const proj = pathsToProject.get(path.repoRel);
      if (proj === undefined) {
        isNotInTsProject.push(path);
      }
    }

    if (isNotInTsProject.length) {
      failed = true;
      log.error(
        `The following files do not belong to a tsconfig.json file, or that tsconfig.json file is not listed in packages/kbn-ts-projects/projects.ts\n${isNotInTsProject
          .map((file) => ` - ${file.repoRel}`)
          .join('\n')}`
      );
    }

    if (failed) {
      throw createFailError('see above errors');
    } else {
      log.success('All TS files belong to a single ts project');
    }
  },
  {
    usage: `node scripts/ts_project_linter`,
    flags: {
      boolean: ['fix', 'refs-check', 'no-refs-check'],
      string: ['project'],
      alias: { f: 'fix', R: 'no-refs-check' },
      default: { 'refs-check': true },
      help: `
        --no-lint          Disables linting rules, only validting that every file is a member of just one project
        --project          Focus linting on a specific project, disables project membership checks, can be specified multiple times
        --fix              Automatically fix some issues in tsconfig.json files
        -R, --no-refs-check  Disables the reference checking rules, making the linting much faster, but less accruate
      `,
    },
    description:
      'Check that all .ts and .tsx files in the repository are assigned to a tsconfig.json file',
  }
);
