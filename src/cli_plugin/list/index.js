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

import { fromRoot } from '../../core/server/utils';
import list from './list';
import Logger from '../lib/logger';
import { parse } from './settings';
import logWarnings from '../lib/log_warnings';
import { warnIfUsingPluginDirOption } from '../lib/warn_if_plugin_dir_option';

function processCommand(command, options) {
  let settings;
  try {
    settings = parse(command, options);
  } catch (ex) {
    //The logger has not yet been initialized.
    console.error(ex.message);
    process.exit(64); // eslint-disable-line no-process-exit
  }

  const logger = new Logger(settings);

  warnIfUsingPluginDirOption(settings, fromRoot('plugins'), logger);
  logWarnings(settings, logger);
  list(settings, logger);
}

export default function pluginList(program) {
  program
    .command('list')
    .option(
      '-d, --plugin-dir <path>',
      'path to the directory where plugins are stored (DEPRECATED, known to not work for all plugins)',
      fromRoot('plugins')
    )
    .description('list installed plugins')
    .action(processCommand);
}
