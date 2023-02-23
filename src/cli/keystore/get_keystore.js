/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { existsSync } from 'fs';
import { join } from 'path';

import { Logger } from '../logger';
import { getConfigDirectory, getDataPath } from '@kbn/utils';

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
