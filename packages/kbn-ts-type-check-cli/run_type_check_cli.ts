/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fsp from 'fs/promises';

import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';
import { asyncForEachWithLimit, asyncMapWithLimit } from '@kbn/std';
import { SomeDevLog } from '@kbn/some-dev-log';
import { type TsProject, TS_PROJECTS } from '@kbn/ts-projects';

import {
  updateRootRefsConfig,
  cleanupRootRefsConfig,
  ROOT_REFS_CONFIG_PATH,
} from './root_refs_config';

const rel = (from: string, to: string) => {
  const path = Path.relative(from, to);
  return path.startsWith('.') ? path : `./${path}`;
};

async function createTypeCheckConfigs(log: SomeDevLog, projects: TsProject[]) {
  const writes: Array<[path: string, content: string]> = [];

  // write tsconfig.type_check.json files for each project that is not the root
  const queue = new Set(projects);
  for (const project of queue) {
    const config = project.config;
    const base = project.getBase();
    if (base) {
      queue.add(base);
    }

    const typeCheckConfig = {
      ...config,
      extends: base ? rel(project.directory, base.typeCheckConfigPath) : undefined,
      compilerOptions: {
        ...config.compilerOptions,
        composite: true,
        rootDir: '.',
        paths: project.repoRel === 'tsconfig.base.json' ? config.compilerOptions?.paths : undefined,
      },
      kbn_references: undefined,
      references: project.getKbnRefs(TS_PROJECTS).map((refd) => {
        queue.add(refd);

        return {
          path: rel(project.directory, refd.typeCheckConfigPath),
        };
      }),
    };

    writes.push([project.typeCheckConfigPath, JSON.stringify(typeCheckConfig, null, 2)]);
  }

  return new Set(
    await asyncMapWithLimit(writes, 50, async ([path, content]) => {
      try {
        const existing = await Fsp.readFile(path, 'utf8');
        if (existing === content) {
          return path;
        }
      } catch (err) {
        if (err.code !== 'ENOENT') {
          throw err;
        }
      }

      log.verbose('updating', path);
      await Fsp.writeFile(path, content, 'utf8');
      return path;
    })
  );
}

run(
  async ({ log, flagsReader, procRunner }) => {
    if (flagsReader.boolean('clean-cache')) {
      await asyncForEachWithLimit(TS_PROJECTS, 10, async (proj) => {
        await Fsp.rm(Path.resolve(proj.directory, 'target/types'), {
          force: true,
          recursive: true,
        });
      });
      log.warning('Deleted all typescript caches');
    }

    // if the tsconfig.refs.json file is not self-managed then make sure it has
    // a reference to every composite project in the repo
    await updateRootRefsConfig(log);

    const projectFilter = flagsReader.path('project');

    const projects = TS_PROJECTS.filter(
      (p) => !p.isTypeCheckDisabled() && (!projectFilter || p.path === projectFilter)
    );

    const created = await createTypeCheckConfigs(log, projects);

    let pluginBuildResult;
    try {
      log.info(
        `Building TypeScript projects to check types (For visible, though excessive, progress info you can pass --verbose)`
      );

      const relative = Path.relative(
        REPO_ROOT,
        projects.length === 1 ? projects[0].typeCheckConfigPath : ROOT_REFS_CONFIG_PATH
      );

      await procRunner.run('tsc', {
        cmd: Path.relative(REPO_ROOT, require.resolve('typescript/bin/tsc')),
        args: [
          '-b',
          relative,
          '--pretty',
          ...(flagsReader.boolean('verbose') ? ['--verbose'] : []),
        ],
        env: {
          NODE_OPTIONS: '--max-old-space-size=8192',
        },
        cwd: REPO_ROOT,
        wait: true,
      });

      pluginBuildResult = { failed: false };
    } catch (error) {
      pluginBuildResult = { failed: true };
    }

    // cleanup if requested
    if (flagsReader.boolean('cleanup')) {
      log.verbose('cleaning up');
      await cleanupRootRefsConfig();

      await asyncForEachWithLimit(created, 40, async (path) => {
        await Fsp.unlink(path);
      });
    }

    if (pluginBuildResult.failed) {
      throw createFailError('Unable to build TS project refs');
    }
  },
  {
    description: `
      Run the TypeScript compiler without emitting files so that it can check types during development.

      Examples:
        # check types in all projects
        node scripts/type_check

        # check types in a single project
        node scripts/type_check --project packages/kbn-pm/tsconfig.json
    `,
    flags: {
      string: ['project'],
      boolean: ['clean-cache', 'cleanup'],
      help: `
        --project [path]        Path to a tsconfig.json file determines the project to check
        --help                  Show this message
        --clean-cache           Delete any existing TypeScript caches before running type check
        --cleanup               Pass to avoid leaving temporary tsconfig files on disk. Leaving these
                                  files in place makes subsequent executions faster because ts can
                                  identify that none of the imports have changed (it uses creation/update
                                  times) but cleaning them prevents leaving garbage around the repo.
      `,
    },
  }
);
