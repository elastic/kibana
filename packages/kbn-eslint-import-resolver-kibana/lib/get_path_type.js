/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { statSync } = require('fs');

const LRU = require('lru-cache');

const DIR = Symbol('dir');
const FILE = Symbol('file');
const cache = process.env.KIBANA_RESOLVER_HARD_CACHE ? new Map() : new LRU({ maxAge: 1000 });

function getPathType(path) {
  const cached = cache.get(path);
  if (cached !== undefined) {
    return cached;
  }

  let type = null;
  try {
    const stats = statSync(path);
    if (stats.isDirectory()) {
      type = DIR;
    } else if (stats.isFile() || stats.isFIFO()) {
      type = FILE;
    }
  } catch (error) {
    if (!error || (error.code !== 'ENOENT' && error.code !== 'ENOTDIR')) {
      throw error;
    }
  }

  cache.set(path, type);
  return type;
}

exports.isDirectory = function (path) {
  return getPathType(path) === DIR;
};

exports.isFile = function (path) {
  return getPathType(path) === FILE;
};
