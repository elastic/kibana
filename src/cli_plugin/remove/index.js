/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getConfigPath } from '@kbn/utils';
import { remove } from './remove';
import { Logger } from '../lib/logger';
import { parse } from './settings';
import { logWarnings } from '../lib/log_warnings';

function processCommand(command, options) {
  let settings;
  try {
    settings = parse(command, options);
  } catch (ex) {
    // The logger has not yet been initialized.
    console.error(ex.message);
    process.exit(64); // eslint-disable-line no-process-exit
  }

  const logger = new Logger(settings);

  logWarnings(settings, logger);
  remove(settings, logger);
}

export function removeCommand(program) {
  program
    .command('remove <plugin>')
    .option('-q, --quiet', 'disable all process messaging except errors')
    .option('-s, --silent', 'disable all process messaging')
    .option('-c, --config <path>', 'path to the config file', getConfigPath())
    .description('remove a plugin')
    .action(processCommand);
}
