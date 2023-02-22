/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { kibanaPackageJson as pkg } from '@kbn/repo-info';

import Command from '../cli/command';
import { EncryptionConfig } from './encryption_config';

import { generateCli } from './generate';

const argv = process.argv.slice();
const program = new Command('bin/kibana-encryption-keys');

program.version(pkg.version).description('A tool for managing encryption keys');

const encryptionConfig = new EncryptionConfig();

generateCli(program, encryptionConfig);

program
  .command('help <command>')
  .description('Get the help for a specific command')
  .action(function (cmdName) {
    const cmd = Object.values(program.commands).find((command) => command._name === cmdName);
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
