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

import { statSync } from 'fs';
import { errorIfXPackRemove } from '../lib/error_if_x_pack';

import del from 'del';

export default function remove(settings, logger) {
  try {
    let stat;
    try {
      stat = statSync(settings.pluginPath);
    } catch (e) {
      errorIfXPackRemove(settings, logger);
      throw new Error(`Plugin [${settings.plugin}] is not installed`);
    }

    if (!stat.isDirectory()) {
      throw new Error(`[${settings.plugin}] is not a plugin`);
    }

    logger.log(`Removing ${settings.plugin}...`);
    del.sync(settings.pluginPath, { force: true });
    logger.log('Plugin removal complete');
  } catch (err) {
    logger.error(`Unable to remove plugin because of error: "${err.message}"`);
    process.exit(74); // eslint-disable-line no-process-exit
  }
}
