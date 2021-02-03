/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { fromRoot } from '../../core/server/utils';
import { list } from './list';
import { Logger } from '../lib/logger';
import { logWarnings } from '../lib/log_warnings';

function processCommand() {
  const logger = new Logger();
  logWarnings(logger);
  list(fromRoot('plugins'), logger);
}

export function listCommand(program) {
  program.command('list').description('list installed plugins').action(processCommand);
}
