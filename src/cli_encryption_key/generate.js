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
import { appendFileSync } from 'fs';
import { isEmpty } from 'lodash';
import { join } from 'path';

import { getConfigDirectory } from '@kbn/utils';

import { confirm } from '../cli_keystore/utils';
import { Logger } from '../cli_plugin/lib/logger';

export async function generate(encryptionConfig, command) {
  const logger = new Logger();
  const keys = encryptionConfig.generate({ force: command.force });
  if (!command.quiet) {
    if (command.force) {
      logger.log('Regenerating all encryption keys.  Add these to kibana.yml:');
    } else {
      logger.log('Generating missing encryption keys.  Add these to kibana.yml:');
    }
  }
  if (isEmpty(keys)) {
    logger.log('No keys to write.  Use the --force flag to generate new keys.');
  } else {
    logger.log(safeDump(keys));

    if (command.interactive) {
      const write = await confirm('Write to kibana.yml?');
      if (write) {
        const kibanaYML = join(getConfigDirectory(), 'kibana.yml');
        appendFileSync(kibanaYML, safeDump(keys));
        logger.log(`Wrote ${Object.keys(keys).length} settings to kibana.yml.`);
      }
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
