/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Logger } from '../cli_plugin/lib/logger';
import { confirm } from './utils';

export async function create(keystore, command, options) {
  const logger = new Logger(options);

  if (keystore.exists()) {
    const overwrite = await confirm('A Kibana keystore already exists. Overwrite?');

    if (!overwrite) {
      return logger.log('Exiting without modifying keystore.');
    }
  }

  keystore.reset();
  keystore.save();

  logger.log(`Created Kibana keystore in ${keystore.path}`);
}

export function createCli(program, keystore) {
  program
    .command('create')
    .description('Creates a new Kibana keystore')
    .option('-s, --silent', 'prevent all logging')
    .action(create.bind(null, keystore));
}
