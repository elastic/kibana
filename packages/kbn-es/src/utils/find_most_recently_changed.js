/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const path = require('path');
const fs = require('fs');
const glob = require('glob');

/**
 *  Find the most recently modified file that matches the pattern pattern
 *
 *  @param  {String} pattern absolute path with glob expressions
 *  @return {String} Absolute path
 */
exports.findMostRecentlyChanged = function findMostRecentlyChanged(pattern) {
  if (!path.isAbsolute(pattern)) {
    throw new TypeError(`Pattern must be absolute, got ${pattern}`);
  }

  const ctime = (path) => fs.statSync(path).ctime.getTime();

  return glob
    .sync(pattern)
    .sort((a, b) => ctime(a) - ctime(b))
    .pop();
};
