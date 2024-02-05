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
import { commands } from './cli_commands';
import { isCliError } from './errors';
import { log } from './utils';

const isCmdName = (string: any): string is keyof typeof commands => Object.hasOwn(commands, string);
const commandNames = Object.keys(commands).filter(isCmdName);

function help() {
  const availableCommands = commandNames.map((name) => `${name} - ${commands[name].description}`);

  // eslint-disable-next-line no-console
  console.log(dedent`
    usage: es <command> [<args>]

    Assists with running Elasticsearch for Kibana development

    Available commands:

      ${availableCommands.join('\n      ')}

    To start a serverless instance use the 'serverless' command with
    '--projectType' flag or use the '--serverless=<ProjectType>'
    shortcut, for example:

      es --serverless=es

    Global options:

      --help
  `);
}

export async function run(defaults = {}) {
  try {
    const argv = process.argv.slice(2);
    const options = getopts(argv, {
      alias: {
        h: 'help',
      },

      default: defaults,
    });
    const args = options._;
    let commandName = args[0];

    // Converting --serverless flag to command
    // `es --serverless=<projectType>` is just a shortcut for
    // `es serverless --projectType=<projectType>`
    if (options.serverless) {
      const projectType: string = options.serverless;
      commandName = 'serverless';
      args.push('--projectType', projectType);
    }

    if (args.length === 0 || (!commandName && options.help)) {
      help();
      return;
    }

    if (!isCmdName(commandName)) {
      log.error(chalk.red(`[${commandName}] is not a valid command, see 'es --help'`));
      process.exitCode = 1;
      return;
    }
    const command = commands[commandName];

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
}
