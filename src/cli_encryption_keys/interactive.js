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
import { writeFileSync } from 'fs';
import { join } from 'path';
import { confirm, question } from '../cli_keystore/utils';
import { getConfigDirectory } from '@kbn/utils';
import { safeDump } from 'js-yaml';

export async function interactive(keys, docs, logger) {
  const settings = Object.keys(keys);
  logger.log(
    'This tool will ask you a number of questions in order to generate the right set of keys for your needs.\n'
  );
  const setKeys = {};
  for (let i = 0; i < settings.length; i++) {
    const setting = settings[i];
    const include = await confirm(`Set ${setting}?`);
    if (include) setKeys[setting] = keys[setting];
  }
  const count = Object.keys(setKeys).length;
  const plural = count > 1 ? 's were' : ' was';
  logger.log('');
  if (!count) return logger.log('No keys were generated');
  logger.log(`The following key${plural} generated:`);
  logger.log(Object.keys(setKeys).join('\n'));
  logger.log('');
  const write = await confirm('Save generated keys to a sample Kibana configuration file?');
  if (write) {
    const defaultSaveLocation = join(getConfigDirectory(), 'kibana.sample.yml');
    const promptedSaveLocation = await question(
      `What filename should be used for the sample Kibana config file? [${defaultSaveLocation}])`
    );
    const saveLocation = promptedSaveLocation || defaultSaveLocation;
    writeFileSync(saveLocation, docs + safeDump(setKeys));
    logger.log(`Wrote configuration to ${saveLocation}`);
  } else {
    logger.log('\nSettings:');
    logger.log(safeDump(setKeys));
  }
}
