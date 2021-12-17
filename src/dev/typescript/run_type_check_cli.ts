/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Os from 'os';

import * as Rx from 'rxjs';
import { mergeMap, reduce } from 'rxjs/operators';
import execa from 'execa';
import { run, createFailError } from '@kbn/dev-utils';
import { lastValueFrom } from '@kbn/std';

import { PROJECTS } from './projects';
import { buildTsRefs } from './build_ts_refs';
import { updateRootRefsConfig } from './root_refs_config';

export async function runTypeCheckCli() {
  run(
    async ({ log, flags, procRunner }) => {
      // if the tsconfig.refs.json file is not self-managed then make sure it has
      // a reference to every composite project in the repo
      await updateRootRefsConfig(log);

      const projectFilter =
        flags.project && typeof flags.project === 'string'
          ? Path.resolve(flags.project)
          : undefined;

      const projects = PROJECTS.filter((p) => {
        return !p.disableTypeCheck && (!projectFilter || p.tsConfigPath === projectFilter);
      });

      const { failed } = await buildTsRefs({
        log,
        procRunner,
        verbose: !!flags.verbose,
        project: projects.length === 1 ? projects[0] : undefined,
      });
      if (failed) {
        throw createFailError('Unable to build TS project refs');
      }

      if (!projects.length) {
        if (projectFilter) {
          throw createFailError(`Unable to find project at ${flags.project}`);
        } else {
          throw createFailError(`Unable to find projects to type-check`);
        }
      }

      const concurrency = Math.min(4, Math.round((Os.cpus() || []).length / 2) || 1) || 1;
      log.info('running type check in', projects.length, 'projects');

      const tscArgs = [
        ...['--emitDeclarationOnly', 'false'],
        '--noEmit',
        '--pretty',
        ...(flags['skip-lib-check']
          ? ['--skipLibCheck', flags['skip-lib-check'] as string]
          : ['--skipLibCheck', 'false']),
      ];

      const failureCount = await lastValueFrom(
        Rx.from(projects).pipe(
          mergeMap(async (p) => {
            const relativePath = Path.relative(process.cwd(), p.tsConfigPath);

            const result = await execa(
              process.execPath,
              [
                '--max-old-space-size=5120',
                require.resolve('typescript/bin/tsc'),
                ...['--project', p.tsConfigPath],
                ...tscArgs,
              ],
              {
                reject: false,
                all: true,
              }
            );

            if (result.failed) {
              log.error(`Type check failed in ${relativePath}:`);
              log.error(result.all ?? ' - tsc produced no output - ');
              return 1;
            } else {
              log.success(relativePath);
              return 0;
            }
          }, concurrency),
          reduce((acc, f) => acc + f, 0)
        )
      );

      if (failureCount > 0) {
        throw createFailError(`${failureCount} type checks failed`);
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
        boolean: ['skip-lib-check'],
        help: `
          --project [path]    Path to a tsconfig.json file determines the project to check
          --skip-lib-check    Skip type checking of all declaration files (*.d.ts). Default is false
          --help              Show this message
        `,
      },
    }
  );
}
