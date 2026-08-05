/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const DotText = require('@kbn/dot-text');

/** @type {import('./types').Transform} */
const dotTextTransform = (path, source, cache) => {
  const key = cache.getKey(path, source);

  const cached = cache.getCode(key);
  if (cached) {
    return cached;
  }

  const code = DotText.getJsSourceSync({
    content: source,
    path,
  }).source;

  cache.update(key, {
    code,
  });

  return code;
};

module.exports = { dotTextTransform };
