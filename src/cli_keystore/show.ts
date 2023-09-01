/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { writeFileSync, existsSync } from 'fs';

import { Keystore } from '../cli/keystore';
import { Logger } from '../cli/logger';

interface ShowOptions {
  silent?: boolean;
  output?: string;
}

export function show(keystore: Keystore, key: string, options: ShowOptions = {}): number | void {
  const { silent, output } = options;
  const logger = new Logger({ silent });

  if (!keystore.exists()) {
    logger.error("ERROR: Kibana keystore not found. Use 'create' command to create one.");
    return -1;
  }

  if (!keystore.has(key)) {
    logger.error("ERROR: Kibana keystore doesn't have requested key.");
    return -1;
  }

  const value = keystore.data[key];
  const valueAsString = typeof value === 'string' ? value : JSON.stringify(value);

  if (output) {
    if (existsSync(output)) {
      logger.error('ERROR: Output file already exists. Remove it before retrying.');
      return -1;
    } else {
      writeFileSync(output, valueAsString);
      logger.log('Writing output to file: ' + output);
    }
  } else {
    logger.log(valueAsString);
  }

  return 0;
}

export function showCli(program: any, keystore: Keystore) {
  program
    .command('show <key>')
    .description(
      'Displays the value of a single setting in the keystore. Pass the -o (or --output) parameter to write the setting to a file.'
    )
    .option('-s, --silent', 'prevent all logging')
    .option('-o, --output <file>', 'output value to a file')
    .action((key: string, options: ShowOptions) => {
      process.exitCode = show(keystore, key, options) || 0;
    });
}
