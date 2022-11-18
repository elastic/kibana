/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';
import Crypto from 'crypto';

import * as Peggy from '@kbn/peggy';

import { Transform } from './transform';

export const peggyTransform: Transform = (path, source, cache) => {
  const config = Peggy.findConfigFile(path);
  const mtime = `${Fs.statSync(path).mtimeMs}`;
  const key = !config
    ? path
    : `${path}.config.${Crypto.createHash('sha256')
        .update(config.source)
        .digest('hex')
        .slice(0, 8)}`;

  if (cache.getMtime(key) === mtime) {
    const code = cache.getCode(key);
    if (code) {
      return code;
    }
  }

  const code = Peggy.getJsSourceSync({
    content: source,
    path,
    format: 'commonjs',
    optimize: 'speed',
    config,
    skipConfigSearch: true,
  }).source;

  cache.update(key, {
    code,
    mtime,
  });

  return code;
};
