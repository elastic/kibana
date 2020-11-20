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
