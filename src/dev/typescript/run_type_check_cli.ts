/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { ToolingLog } from '@kbn/dev-utils';
import chalk from 'chalk';
import dedent from 'dedent';
import getopts from 'getopts';

import { execInProjects } from './exec_in_projects';
import { filterProjectsByFlag } from './projects';

export function runTypeCheckCli() {
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

  const tscArgs = ['--noEmit', '--pretty', ...(opts['skip-lib-check'] ? ['--skipLibCheck'] : [])];
  const projects = filterProjectsByFlag(opts.project);

  if (!projects.length) {
    log.error(`Unable to find project at ${opts.project}`);
    process.exit(1);
  }

  execInProjects(log, projects, process.execPath, project => [
    ...(project.name === 'x-pack' ? ['--max-old-space-size=4096'] : []),
    require.resolve('typescript/bin/tsc'),
    ...['--project', project.tsConfigPath],
    ...tscArgs,
  ]);
}
