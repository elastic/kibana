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

import _ from 'lodash';

import { pkg } from '../core/server/utils';
import Command from '../cli/command';
import { Keystore } from '../legacy/server/keystore';

import { createCli } from './create';
import { listCli } from './list';
import { addCli } from './add';
import { removeCli } from './remove';
import { getKeystore } from './get_keystore';

const argv = process.env.kbnWorkerArgv
  ? JSON.parse(process.env.kbnWorkerArgv)
  : process.argv.slice();
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
