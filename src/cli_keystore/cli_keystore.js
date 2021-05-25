/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { kibanaPackageJson as pkg } from '@kbn/utils';

import Command from '../cli/command';
import { Keystore } from '../cli/keystore';

import { createCli } from './create';
import { listCli } from './list';
import { addCli } from './add';
import { removeCli } from './remove';
import { getKeystore } from './get_keystore';

const argv = process.argv.slice();
const program = new Command('bin/kibana-keystore');

program
  .version(pkg.version)
  .description('A tool for managing settings stored in the Kibana keystore');

const keystore = new Keystore(getKeystore());

createCli(program, keystore);
listCli(program, keystore);
addCli(program, keystore);
removeCli(program, keystore);

program
  .command('help <command>')
  .description('get the help for a specific command')
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
  program.defaultHelp();
}

program.parse(process.argv);
