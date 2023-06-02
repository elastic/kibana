/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Logger } from '../cli/logger';
import { confirm, question } from './utils';
// import from path since add.test.js mocks 'fs' required for @kbn/utils
import { createPromiseFromStreams, createConcatStream } from '@kbn/utils/src/streams';

/**
 * @param {Keystore} keystore
 * @param {String} key
 * @param {Object|null} options
 * @property {Boolean} options.force - if true, will overwrite without prompting
 * @property {Stream} options.stdinStream - defaults to process.stdin
 * @property {Boolean} options.stdin - if true, uses options.stdin to read value
 */

export async function add(keystore, key, options = {}) {
  const logger = new Logger(options);
  let value;

  if (!keystore.exists()) {
    return logger.error("ERROR: Kibana keystore not found. Use 'create' command to create one.");
  }

  if (!options.force && keystore.has(key)) {
    if (options.stdin) {
      return logger.log(`Setting ${key} already exists, exiting without modifying keystore.`);
    } else {
      const overwrite = await confirm(`Setting ${key} already exists. Overwrite?`);

      if (!overwrite) {
        return logger.log('Exiting without modifying keystore.');
      }
    }
  }

  if (options.stdin) {
    value = await createPromiseFromStreams([
      options.stdinStream || process.stdin,
      createConcatStream(''),
    ]);
  } else {
    value = await question(`Enter value for ${key}`, { mask: '*' });
  }

  const parsedValue = value.trim();
  let parsedJsonValue;
  try {
    parsedJsonValue = JSON.parse(parsedValue);
  } catch {
    // noop, only treat value as json if it parses as JSON
  }

  keystore.add(key, parsedJsonValue ?? parsedValue);
  keystore.save();
}

export function addCli(program, keystore) {
  program
    .command('add <key>')
    .description(
      'Add a setting to the keystore. Note: The value will be JSON parsed. Use quotes to force string inputs.'
    )
    .option('-f, --force', 'overwrite existing setting without prompting')
    .option('-x, --stdin', 'read setting value from stdin')
    .option('-s, --silent', 'prevent all logging')
    .action(add.bind(null, keystore));
}
