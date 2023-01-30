/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const Fs = require('fs');

const { transformCode } = require('@kbn/babel-transform');

/** @type {import('./types').Transform} */
const babelTransform = (path, source, cache) => {
  const mtime = `${Fs.statSync(path).mtimeMs}`;

  if (cache.getMtime(path) === mtime) {
    const code = cache.getCode(path);
    if (code) {
      return code;
    }
  }

  const result = transformCode(path, source);

  cache.update(path, {
    mtime,
    code: result.code,
    map: result.map,
  });

  return result.code;
};

module.exports = { babelTransform };
