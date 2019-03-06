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

import Logger from '../cli_plugin/lib/logger';
import { confirm } from '../legacy/server/utils';

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
