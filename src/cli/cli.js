/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';
import { kibanaPackageJson as pkg } from '@kbn/repo-info';
import Command from './command';
import serveCommand from './serve/serve';
import profiler from './profiler/profiler';

const argv = process.argv.slice();
const program = new Command('bin/kibana');

program
  .version(pkg.version)
  .description(
    'Kibana is an open source, browser based analytics and search dashboard for Elasticsearch.'
  );

// attach commands
serveCommand(program);
profiler(program);

program
  .command('help <command>')
  .description('Get the help for a specific command')
  .action(function (cmdName) {
    const cmd = _.find(program.commands, { _name: cmdName });
    if (!cmd) return program.error(`unknown command ${cmdName}`);
    cmd.help();
  });

program.command('*', null, { noHelp: true }).action(function (cmd) {
  program.error(`unknown command ${cmd}`);
});

// check for no command name
const subCommand = argv[2] && !String(argv[2][0]).match(/^-|^\.|\//);

if (!subCommand) {
  if (_.intersection(argv.slice(2), ['-h', '--help']).length) {
    program.defaultHelp();
  } else {
    argv.splice(2, 0, ['serve']);
  }
}

program.parse(argv);
