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
import { appendFileSync } from 'fs';
import { join } from 'path';
import { confirm } from '../cli_keystore/utils';
import { getConfigDirectory } from '@kbn/utils';
import { safeDump } from 'js-yaml';

export async function interactive(keys, logger) {
  const settings = Object.keys(keys);
  logger.log('Generating settings for:');
  logger.log(settings.join('\n'));
  logger.log('');
  const setKeys = {};
  for (let i = 0; i < settings.length; i++) {
    const setting = settings[i];
    const include = await confirm(`Set ${setting}?`);
    if (include) setKeys[setting] = keys[setting];
  }
  const count = Object.keys(setKeys).length;
  const plural = count > 1 ? 's' : '';
  const write = await confirm(
    `Write ${Object.keys(setKeys).length} setting${plural} to kibana.yml?`
  );
  if (write) {
    const kibanaYML = join(getConfigDirectory(), 'kibana.yml');
    appendFileSync(kibanaYML, safeDump(setKeys));
  }
}
