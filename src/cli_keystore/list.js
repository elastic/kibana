/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Logger } from '../cli/logger';

export function list(keystore, options = {}) {
  const logger = new Logger(options);

  if (!keystore.exists()) {
    return logger.error("ERROR: Kibana keystore not found. Use 'create' command to create one.");
  }

  const keys = keystore.keys();
  logger.log(keys.join('\n'));
}

export function listCli(program, keystore) {
  program
    .command('list')
    .description('List entries in the keystore')
    .option('-s, --silent', 'prevent all logging')
    .action(list.bind(null, keystore));
}
