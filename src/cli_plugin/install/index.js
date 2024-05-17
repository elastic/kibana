/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { kibanaPackageJson as pkg } from '@kbn/repo-info';
import { getConfigPath } from '@kbn/utils';
import { Logger } from '../../cli/logger';
import { logWarnings } from '../lib/log_warnings';
import { install } from './install';
import { parse, parseMilliseconds } from './settings';

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

  logWarnings(logger);
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
