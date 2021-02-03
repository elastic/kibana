/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
  for (const setting of settings) {
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
