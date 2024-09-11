/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { safeDump } from 'js-yaml';
import { isEmpty } from 'lodash';
import { interactive } from './interactive';
import { Logger } from '../cli/logger';

export async function generate(encryptionConfig, command) {
  const logger = new Logger();
  const keys = encryptionConfig.generate({ force: command.force });
  if (isEmpty(keys)) {
    logger.log('No keys to write.  Use the --force flag to generate new keys.');
  } else {
    if (!command.quiet) {
      logger.log('## Kibana Encryption Key Generation Utility\n');
      logger.log(
        `The 'generate' command guides you through the process of setting encryption keys for:\n`
      );
      logger.log(encryptionConfig.docs());
      logger.log(
        'Already defined settings are ignored and can be regenerated using the --force flag.  Check the documentation links for instructions on how to rotate encryption keys.'
      );
      logger.log('Definitions should be set in the kibana.yml used configure Kibana.\n');
    }
    if (command.interactive) {
      await interactive(keys, encryptionConfig.docs({ comment: true }), logger);
    } else {
      if (!command.quiet) logger.log('Settings:');
      logger.log(safeDump(keys));
    }
  }
}

export function generateCli(program, encryptionConfig) {
  program
    .command('generate')
    .description('Generates encryption keys')
    .option('-i, --interactive', 'interactive output')
    .option('-q, --quiet', 'do not include instructions')
    .option('-f, --force', 'generate new keys for all settings')
    .action(generate.bind(null, encryptionConfig));
}
