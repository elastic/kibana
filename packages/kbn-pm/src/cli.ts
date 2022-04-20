/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import dedent from 'dedent';
import getopts from 'getopts';
import { resolve } from 'path';
import { pickLevelFromFlags } from '@kbn/tooling-log';

import { commands } from './commands';
import { runCommand } from './run';
import { log } from './utils/log';

function help() {
  log.info(
    dedent`
      usage: kbn <command> [<args>]

      By default commands are run for Kibana itself, all packages in the 'packages/'
      folder and for all plugins in './plugins' and '../kibana-extra'.

      Available commands:

        ${Object.values(commands)
          .map((command) => `${command.name} - ${command.description}`)
          .join('\n        ')}

      Global options:

        -e, --exclude           Exclude specified project. Can be specified multiple times to exclude multiple projects, e.g. '-e kibana -e @kbn/pm'.
        -i, --include           Include only specified projects. If left unspecified, it defaults to including all projects.
        --oss                   Do not include the x-pack when running command.
        --skip-kibana-plugins   Filter all plugins in ./plugins and ../kibana-extra when running command.
        --no-cache              Disable the kbn packages bootstrap cache
        --no-validate           Disable the bootstrap yarn.lock validation
        --force-install         Forces yarn install to run on bootstrap
        --offline               Run in offline mode
        --verbose               Set log level to verbose
        --debug                 Set log level to debug
        --quiet                 Set log level to error
        --silent                Disable log output

      "run" options:
        --skip-missing          Ignore packages which don't have the requested script
    ` + '\n'
  );
}

export async function run(argv: string[]) {
  log.setLogLevel(
    pickLevelFromFlags(
      getopts(argv, {
        boolean: ['verbose', 'debug', 'quiet', 'silent', 'skip-missing'],
      })
    )
  );

  // We can simplify this setup (and remove this extra handling) once Yarn
  // starts forwarding the `--` directly to this script, see
  // https://github.com/yarnpkg/yarn/blob/b2d3e1a8fe45ef376b716d597cc79b38702a9320/src/cli/index.js#L174-L182
  if (argv.includes('--')) {
    log.error(`Using "--" is not allowed, as it doesn't work with 'yarn kbn'.`);
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
      'force-install': false,
      offline: false,
      validate: true,
    },
    boolean: ['cache', 'force-install', 'offline', 'validate'],
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
    log.error(`[${commandName}] is not a valid command, see 'kbn --help'`);
    process.exit(1);
  }

  await runCommand(command, commandOptions);
}
