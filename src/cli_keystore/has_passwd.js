/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Logger } from '../cli/logger';

export function hasPasswd(keystore, options = {}) {
  const logger = new Logger();

  if (!keystore.exists()) {
    if (!options.silent) logger.error('Error: Keystore not found');
    return process.exit(1);
  }

  if (!keystore.hasPassword()) {
    if (!options.silent) logger.error('Error: Keystore is not password protected');
    return process.exit(1);
  }

  if (!options.silent) {
    logger.log('Keystore is password-protected');
    return process.exit(0);
  }
}

export function hasPasswdCli(program, keystore) {
  program
    .command('has-passwd')
    .description(
      'Succeeds if the keystore exists and is password-protected, fails with exit code 1 otherwise'
    )
    .option('-s, --silent', 'prevent all logging')
    .action(hasPasswd.bind(null, keystore));
}
