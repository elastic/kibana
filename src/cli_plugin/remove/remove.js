/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { statSync } from 'fs';

import del from 'del';

import { errorIfXPackRemove } from '../lib/error_if_x_pack';

export function remove(settings, logger) {
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
