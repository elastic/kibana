/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * cheerio 1.2.0 compatibility hook for enzyme.
 *
 * enzyme (unmaintained) imports 'cheerio/lib/utils' which was moved to
 * 'cheerio/utils' in cheerio 1.0+. The new exports map in cheerio's
 * package.json does not include './lib/utils', causing Node.js to throw
 * ERR_PACKAGE_PATH_NOT_EXPORTED at runtime.
 *
 * This module patches Module._resolveFilename to redirect the old import
 * path to the new one. It must be loaded before enzyme is required.
 *
 * Used by: FTR tests and any other non-Jest context that loads enzyme.
 * Jest tests use a separate resolver redirect (see kbn-test/src/jest/resolver.js).
 */

const Module = require('module');

const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === 'cheerio/lib/utils') {
    return originalResolveFilename.call(this, 'cheerio/utils', parent, isMain, options);
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};
