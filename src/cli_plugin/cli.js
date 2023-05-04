/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { kibanaPackageJson as pkg } from '@kbn/repo-info';
import Command from '../cli/command';
import { listCommand } from './list';
import { installCommand } from './install';
import { removeCommand } from './remove';

const argv = process.argv.slice();
const program = new Command('bin/kibana-plugin');

program
  .version(pkg.version)
  .description(
    'The Kibana plugin manager enables you to install and remove plugins that ' +
      'provide additional functionality to Kibana'
  );

listCommand(program);
installCommand(program);
removeCommand(program);

program
  .command('help <command>')
  .description('get the help for a specific command')
  .action(function (cmdName) {
    const cmd = program.commands.find((c) => c._name === cmdName);

    if (!cmd) {
      return program.error(`unknown command ${cmdName}`);
    }

    cmd.help();
  });

program.command('*', null, { noHelp: true }).action(function (cmd) {
  program.error(`unknown command ${cmd}`);
});

// check for no command name
const subCommand = argv[2] && !String(argv[2][0]).match(/^-|^\.|\//);
if (!subCommand) {
  program.defaultHelp();
}

program.parse(argv);
