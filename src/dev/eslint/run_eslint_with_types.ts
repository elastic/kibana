/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';
import Os from 'os';

import execa from 'execa';
import * as Rx from 'rxjs';
import { mergeMap, reduce } from 'rxjs/operators';
import { supportsColor } from 'chalk';
import { run, createFailError } from '@kbn/dev-utils';
import { REPO_ROOT } from '@kbn/utils';

import { PROJECTS } from '../typescript/projects';
import { Project } from '../typescript/project';

export function runEslintWithTypes() {
  run(
    async ({ log, flags }) => {
      const eslintPath = require.resolve('eslint/bin/eslint');
      const ignoreFilePath = Path.resolve(REPO_ROOT, '.eslintignore');
      const configTemplate = Fs.readFileSync(
        Path.resolve(__dirname, 'types.eslint.config.template.js'),
        'utf8'
      );

      const projectFilter =
        flags.project && typeof flags.project === 'string'
          ? Path.resolve(flags.project)
          : undefined;

      const projects = PROJECTS.filter((project) => {
        if (project.disableTypeCheck) {
          log.verbose(`[${project.name}] skipping project with type checking disabled`);
          return false;
        }

        if (projectFilter && project.tsConfigPath !== projectFilter) {
          log.verbose(`[${project.name}] skipping because it doesn't match --project`);
          return false;
        }

        return true;
      });

      if (!projects.length) {
        if (projectFilter) {
          throw createFailError(`[${projectFilter}] is not a valid tsconfig project`);
        }

        throw createFailError('unable to find projects to lint');
      }

      const concurrency = Math.max(1, Math.round((Os.cpus() || []).length / 2) || 1) || 1;
      log.info(`Linting ${projects.length} projects, ${concurrency} at a time`);

      const failures = await Rx.lastValueFrom(
        Rx.from(projects).pipe(
          mergeMap(async (project) => {
            const configFilePath = Path.resolve(project.directory, 'types.eslint.config.js');

            Fs.writeFileSync(
              configFilePath,
              configTemplate.replace(
                `'{PACKAGE_CONFIG}'`,
                JSON.stringify(JSON.stringify({ rootDir: project.directory }))
              ),
              'utf8'
            );

            const proc = await execa(
              process.execPath,
              [
                Path.relative(project.directory, eslintPath),
                ...project.getIncludePatterns().map((p) => (p.endsWith('*') ? `${p}.{ts,tsx}` : p)),
                ...project.getExcludePatterns().flatMap((p) => ['--ignore-pattern', p]),
                ...['--ignore-pattern', '**/*.json'],
                ...['--ext', '.ts,.tsx'],
                '--no-error-on-unmatched-pattern',
                '--no-inline-config',
                '--no-eslintrc',
                ...['--config', Path.relative(project.directory, configFilePath)],
                ...['--ignore-path', Path.relative(project.directory, ignoreFilePath)],
                ...(flags.verbose ? ['--debug'] : []),
                ...(flags.fix ? ['--fix'] : []),
              ],
              {
                cwd: project.directory,
                env: {
                  ...(supportsColor ? { FORCE_COLOR: 'true' } : {}),
                  ...process.env,
                },
                buffer: true,
                all: true,
                reject: false,
              }
            );

            if (proc.exitCode === 0) {
              Fs.unlinkSync(configFilePath);
              log.success(project.name);
              return undefined;
            } else {
              log.error(`${project.name} failed`);
              log.indent(4, () => {
                log.write(proc.all);
              });
              return project;
            }
          }, concurrency),
          reduce((acc: Project[], project) => {
            if (project) {
              return [...acc, project];
            } else {
              return acc;
            }
          }, [])
        )
      );

      if (!failures.length) {
        log.success(`All projects validated successfully!`);
        if (flags.fix) {
          log.info(`
❗️ After staging your changes, don't forget to run eslint/prettier on them with:

    node scripts/precommit_hook --fix
`);
        }

        return;
      }

      throw createFailError(
        `
          ${
            failures.length
          } projects failed, run the following commands locally to try auto-fixing them:

            ${failures
              .map(
                (p) =>
                  `node scripts/eslint_with_types --fix --project ${Path.relative(
                    REPO_ROOT,
                    p.tsConfigPath
                  )}`
              )
              .join('\n            ')}
        `
      );
    },
    {
      description:
        'Run ESLint in each TS project, feeding it the TS config so it can validate our code using the type information',
      flags: {
        string: ['project'],
        boolean: ['fix'],
        help: `
          --project          Only run eslint on a specific ts project
          --fix              Run eslint in --fix mode
        `,
      },
    }
  );
}
