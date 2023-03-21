/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { fromRoot } from '@kbn/repo-info';
import { list } from './list';
import { Logger } from '../../cli/logger';
import { logWarnings } from '../lib/log_warnings';

function processCommand() {
  const logger = new Logger();
  logWarnings(logger);
  list(fromRoot('plugins'), logger);
}

export function listCommand(program) {
  program.command('list').description('list installed plugins').action(processCommand);
}
