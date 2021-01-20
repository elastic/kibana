/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ToolingLog } from '@kbn/dev-utils';
import chalk from 'chalk';
import dedent from 'dedent';
import getopts from 'getopts';

import { execInProjects } from './exec_in_projects';
import { filterProjectsByFlag } from './projects';
import { buildAllRefs } from './build_refs';

export async function runTypeCheckCli() {
  const extraFlags: string[] = [];
  const opts = getopts(process.argv.slice(2), {
    boolean: ['skip-lib-check', 'help'],
    default: {
      project: undefined,
    },
    unknown(name) {
      extraFlags.push(name);
      return false;
    },
  });

  const log = new ToolingLog({
    level: 'info',
    writeTo: process.stdout,
  });

  if (extraFlags.length) {
    for (const flag of extraFlags) {
      log.error(`Unknown flag: ${flag}`);
    }

    process.exitCode = 1;
    opts.help = true;
  }

  if (opts.help) {
    process.stdout.write(
      dedent(chalk`
        {dim usage:} node scripts/type_check [...options]

        Run the TypeScript compiler without emitting files so that it can check
        types during development.

        Examples:

          {dim # check types in all projects}
          {dim $} node scripts/type_check

          {dim # check types in a single project}
          {dim $} node scripts/type_check --project packages/kbn-pm/tsconfig.json

        Options:

          --project [path]    {dim Path to a tsconfig.json file determines the project to check}
          --skip-lib-check    {dim Skip type checking of all declaration files (*.d.ts)}
          --help              {dim Show this message}
      `)
    );
    process.stdout.write('\n');
    process.exit();
  }

  await buildAllRefs(log);

  const tscArgs = [
    // composite project cannot be used with --noEmit
    ...['--composite', 'false'],
    ...['--emitDeclarationOnly', 'false'],
    '--noEmit',
    '--pretty',
    ...(opts['skip-lib-check'] ? ['--skipLibCheck'] : []),
  ];
  const projects = filterProjectsByFlag(opts.project).filter((p) => !p.disableTypeCheck);

  if (!projects.length) {
    log.error(`Unable to find project at ${opts.project}`);
    process.exit(1);
  }

  execInProjects(log, projects, process.execPath, (project) => [
    '--max-old-space-size=5120',
    require.resolve('typescript/bin/tsc'),
    ...['--project', project.tsConfigPath],
    ...tscArgs,
  ]);
}
