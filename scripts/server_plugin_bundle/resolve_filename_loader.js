/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

var path = require('path');

// Piscina needs a filesystem path. Rspack rewrites require.resolve() to a
// numeric module id, which fails the filename check.
module.exports = function resolveFilenameLoader(source) {
  var dir = path.dirname(this.resourcePath);
  return source.replace(
    /require\.resolve\((['"])(\.\/[^'"]+)\1\)/g,
    function (_match, _quote, rel) {
      return JSON.stringify(path.resolve(dir, rel));
    }
  );
};
