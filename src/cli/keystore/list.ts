/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
// @ts-nocheck

import { Logger } from '../logger';
import { Keystore } from './lib';

export async function list(keystore: Keystore, options: any = {}) {
  const logger = new Logger(options);
  await keystore.load();

  if (!keystore.exists()) {
    return logger.error("ERROR: Kibana keystore not found. Use 'create' command to create one.");
  }

  const keys = keystore.keys();
  logger.log(keys.join('\n'));
}

export function listCli(program: any, keystore: Keystore) {
  program
    .command('list')
    .description('List entries in the keystore')
    .option('-s, --silent', 'prevent all logging')
    .action(list.bind(null, keystore));
}
