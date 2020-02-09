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
import listCommand from './list';
import installCommand from './install';
import removeCommand from './remove';

const argv = process.env.kbnWorkerArgv
  ? JSON.parse(process.env.kbnWorkerArgv)
  : process.argv.slice();
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
  .action(function(cmdName) {
    const cmd = _.find(program.commands, { _name: cmdName });
    if (!cmd) return program.error(`unknown command ${cmdName}`);
    cmd.help();
  });

program.command('*', null, { noHelp: true }).action(function(cmd) {
  program.error(`unknown command ${cmd}`);
});

// check for no command name
const subCommand = argv[2] && !String(argv[2][0]).match(/^-|^\.|\//);
if (!subCommand) {
  program.defaultHelp();
}

program.parse(argv);
