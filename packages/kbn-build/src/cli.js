import { resolve } from 'path';
import getopts from 'getopts';
import dedent from 'dedent';
import chalk from 'chalk';

import * as commands from './commands';
import { runCommand } from './run';

function help() {
  const availableCommands = Object.keys(commands)
    .map(commandName => commands[commandName])
    .map(command => `${command.name} - ${command.description}`);

  console.log(dedent`
    usage: kbn <command> [<args>]

    By default commands are run for Kibana itself, all packages in the 'packages/'
    folder and for all plugins in ../kibana-extra.

    Available commands:

       ${availableCommands.join('\n       ')}

    Global options:

       --skip-kibana        Do not include the root Kibana project when running command.
       --skip-kibana-extra  Filter all plugins in ../kibana-extra when running command.
  `);
}

export async function run(argv) {
  const options = getopts(argv, {
    alias: {
      h: 'help'
    }
  });

  const args = options._;

  if (options.help || args.length === 0) {
    help();
    return;
  }

  const rootPath = process.cwd();

  const commandName = args[0];
  const extraArgs = args.slice(1);

  const commandOptions = { options, extraArgs, rootPath };

  const command = commands[commandName];
  if (command === undefined) {
    console.log(
      chalk.red(`[${commandName}] is not a valid command, see 'kbn --help'`)
    );
    process.exit(1);
  }

  await runCommand(command, commandOptions);
}
