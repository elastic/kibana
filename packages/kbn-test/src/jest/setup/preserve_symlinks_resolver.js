/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// Inspired in a discussion found at https://github.com/facebook/jest/issues/5356 as Jest currently doesn't
// offer any other option to preserve symlinks.
//
// It would be available once https://github.com/facebook/jest/pull/9976 got merged.

const resolve = require('resolve');

module.exports = (request, options) => {
  try {
    return resolve.sync(request, {
      basedir: options.basedir,
      extensions: options.extensions,
      preserveSymlinks: true,
    });
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      return options.defaultResolver(request, options);
    }

    throw error;
  }
};
