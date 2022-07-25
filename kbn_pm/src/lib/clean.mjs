/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';
import Fsp from 'fs/promises';
import Path from 'path';

/**
 *
 * @param {import('@kbn/some-dev-log').SomeDevLog} log
 * @param {string[]} paths
 */
export async function cleanPaths(log, paths) {
  for (const path of paths) {
    if (!Fs.existsSync(path)) {
      continue;
    }

    log.info('deleting', Path.relative(process.cwd(), path));
    await Fsp.rm(path, {
      recursive: true,
      force: true,
    });
  }
}
