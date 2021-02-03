/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getConfigPath } from '@kbn/utils';
import { pkg } from '../../core/server/utils';
import { install } from './install';
import { Logger } from '../lib/logger';
import { parse, parseMilliseconds } from './settings';
import { logWarnings } from '../lib/log_warnings';

function processCommand(command, options) {
  let settings;
  try {
    settings = parse(command, options, pkg);
  } catch (ex) {
    //The logger has not yet been initialized.
    console.error(ex.message);
    process.exit(64);
  }

  const logger = new Logger(settings);

  logWarnings(settings, logger);
  install(settings, logger);
}

export function installCommand(program) {
  program
    .command('install <plugin/url>')
    .option('-q, --quiet', 'disable all process messaging except errors')
    .option('-s, --silent', 'disable all process messaging')
    .option('-c, --config <path>', 'path to the config file', getConfigPath())
    .option(
      '-t, --timeout <duration>',
      'length of time before failing; 0 for never fail',
      parseMilliseconds
    )
    .description(
      'install a plugin',
      `Common examples:
  install file:///Path/to/my/x-pack.zip
  install https://path.to/my/x-pack.zip`
    )
    .action(processCommand);
}
