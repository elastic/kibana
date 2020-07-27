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

import { existsSync } from 'fs';
import { join } from 'path';

import Logger from '../cli_plugin/lib/logger';
import { getConfigDirectory, getDataPath } from '../core/server/path';

export function getKeystore() {
  const configKeystore = join(getConfigDirectory(), 'kibana.keystore');
  const dataKeystore = join(getDataPath(), 'kibana.keystore');
  let keystorePath = null;
  if (existsSync(dataKeystore)) {
    const logger = new Logger();
    logger.log(
      `kibana.keystore located in the data folder is deprecated.  Future versions will use the config folder.`
    );
    keystorePath = dataKeystore;
  } else {
    keystorePath = configKeystore;
  }
  return keystorePath;
}
