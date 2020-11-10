/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { safeDump } from 'js-yaml';
import { isEmpty } from 'lodash';
import { interactive } from './interactive';
import { Logger } from '../cli_plugin/lib/logger';

export async function generate(encryptionConfig, command) {
  const logger = new Logger();
  const keys = encryptionConfig.generate({ force: command.force });
  if (isEmpty(keys)) {
    logger.log('No keys to write.  Use the --force flag to generate new keys.');
  } else {
    if (command.interactive) {
      await interactive(keys, logger);
    } else {
      if (!command.quiet) logger.log('Generating encryption keys.');
      logger.log(safeDump(keys));
    }
  }
  if (command.force && !command.quiet) {
    logger.log('Any pre-existing keys in kibana.yml will need to be rotated manually.');
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
