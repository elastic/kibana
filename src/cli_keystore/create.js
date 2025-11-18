/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Logger } from '../cli/logger';
import { confirm, question } from '../cli/keystore/utils';

export async function create(keystore, options = {}) {
  const logger = new Logger(options);

  if (keystore.exists()) {
    const overwrite = await confirm('A Kibana keystore already exists. Overwrite?');

    if (!overwrite) {
      return logger.log('Exiting without modifying keystore.');
    }
  }

  keystore.reset();

  if (options.password) {
    const password = await question(
      'Enter new password for the kibana keystore (empty for no password)',
      {
        mask: '*',
      }
    );
    if (password) keystore.setPassword(password);
  }

  keystore.save();

  logger.log(`Created Kibana keystore in ${keystore.path}`);
}

export function createCli(program, keystore) {
  program
    .command('create')
    .description('Creates a new Kibana keystore')
    .option('-p, --password', 'Prompt for password to encrypt the keystore')
    .option('-s, --silent', 'Show minimal output')
    .action(create.bind(null, keystore));
}
