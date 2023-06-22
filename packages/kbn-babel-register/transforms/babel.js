/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { transformCode } = require('@kbn/babel-transform');

/** @type {import('./types').Transform} */
const babelTransform = (path, source, cache) => {
  const key = cache.getKey(path, source);
  const cached = cache.getCode(key);
  if (cached) {
    return cached;
  }

  const result = transformCode(path, source);
  cache.update(key, {
    code: result.code,
    map: result.map,
  });

  return result.code;
};

module.exports = { babelTransform };
