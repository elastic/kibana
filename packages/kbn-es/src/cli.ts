/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import chalk from 'chalk';
import getopts from 'getopts';
import dedent from 'dedent';
import * as commands from './cli_commands';
import { isCliError } from './errors';
import { log } from './utils';

interface CliCommand {
  description: string;
  usage?: string;
  help: (defaults: any) => string;
  run: (defaults: any) => Promise<void>;
}

const cliCommands = commands as Record<string, CliCommand>;

function help() {
  const availableCommands = Object.keys(commands).map(
    (name) => `${name} - ${cliCommands[name].description}`
  );

  // eslint-disable-next-line no-console
  console.log(dedent`
    usage: es <command> [<args>]

    Assists with running Elasticsearch for Kibana development

    Available commands:

      ${availableCommands.join('\n      ')}

    Global options:

      --help
  `);
}

export const run = async (defaults = {}) => {
  try {
    const argv = process.argv.slice(2);
    const options = getopts(argv, {
      alias: {
        h: 'help',
      },

      default: defaults,
    });
    const args = options._;
    const commandName = args[0];

    if (args.length === 0 || (!commandName && options.help)) {
      help();
      return;
    }

    const command = cliCommands[commandName];

    if (command === undefined) {
      log.error(chalk.red(`[${commandName}] is not a valid command, see 'es --help'`));
      process.exitCode = 1;
      return;
    }

    if (commandName && options.help) {
      log.write(dedent`
        usage: ${command.usage || `es ${commandName} [<args>]`}

        ${command.description}

        ${command.help(defaults).replace(/\n/g, '\n       ')}
      `);
      return;
    }

    await command.run(defaults);
  } catch (error) {
    if (isCliError(error)) {
      // only log the message, the CLI explicitly threw this message
      // and it doesn't need a stack trace
      log.error(error.message);
    } else {
      log.error('Unhandled error');
      log.error(error);
    }

    process.exitCode = 1;
  }
};
