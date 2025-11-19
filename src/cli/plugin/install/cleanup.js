/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import del from 'del';
import fs from 'fs';

export function cleanPrevious(settings, logger) {
  return new Promise(function (resolve, reject) {
    try {
      fs.statSync(settings.workingPath);

      logger.log('Found previous install attempt. Deleting...');
      try {
        del.sync(settings.workingPath, { force: true });
      } catch (e) {
        reject(e);
      }
      resolve();
    } catch (e) {
      if (e.code !== 'ENOENT') reject(e);

      resolve();
    }
  });
}

export function cleanArtifacts(settings) {
  // delete the working directory.
  // At this point we're bailing, so swallow any errors on delete.
  try {
    del.sync(settings.workingPath);
  } catch (e) {} // eslint-disable-line no-empty
}
