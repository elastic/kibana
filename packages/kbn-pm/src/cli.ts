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

import chalk from 'chalk';
import dedent from 'dedent';
import getopts from 'getopts';
import { resolve } from 'path';

import { commands } from './commands';
import { runCommand } from './run';
import { log } from './utils/log';

function help() {
  const availableCommands = Object.keys(commands)
    .map(commandName => commands[commandName])
    .map(command => `${command.name} - ${command.description}`);

  log.write(dedent`
    usage: kbn <command> [<args>]

    By default commands are run for Kibana itself, all packages in the 'packages/'
    folder and for all plugins in './plugins' and '../kibana-extra'.

    Available commands:

       ${availableCommands.join('\n       ')}

    Global options:

       -e, --exclude          Exclude specified project. Can be specified multiple times to exclude multiple projects, e.g. '-e kibana -e @kbn/pm'.
       -i, --include          Include only specified projects. If left unspecified, it defaults to including all projects.
       --oss                  Do not include the x-pack when running command.
       --skip-kibana-plugins  Filter all plugins in ./plugins and ../kibana-extra when running command.
       --no-cache             Disable the bootstrap cache
  `);
}

export async function run(argv: string[]) {
  // We can simplify this setup (and remove this extra handling) once Yarn
  // starts forwarding the `--` directly to this script, see
  // https://github.com/yarnpkg/yarn/blob/b2d3e1a8fe45ef376b716d597cc79b38702a9320/src/cli/index.js#L174-L182
  if (argv.includes('--')) {
    log.write(chalk.red(`Using "--" is not allowed, as it doesn't work with 'yarn kbn'.`));
    process.exit(1);
  }

  const options = getopts(argv, {
    alias: {
      e: 'exclude',
      h: 'help',
      i: 'include',
    },
    default: {
      cache: true,
    },
    boolean: ['prefer-offline', 'frozen-lockfile', 'cache'],
  });

  const args = options._;

  if (options.help || args.length === 0) {
    help();
    return;
  }

  // This `rootPath` is relative to `./dist/` as that's the location of the
  // built version of this tool.
  const rootPath = resolve(__dirname, '../../../');

  const commandName = args[0];
  const extraArgs = args.slice(1);

  const commandOptions = { options, extraArgs, rootPath };

  const command = commands[commandName];
  if (command === undefined) {
    log.write(chalk.red(`[${commandName}] is not a valid command, see 'kbn --help'`));
    process.exit(1);
  }

  await runCommand(command, commandOptions);
}
