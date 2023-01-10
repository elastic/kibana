/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const Fs = require('fs');
const Path = require('path');
const Crypto = require('crypto');

const { readHashOfPackageMap } = require('@kbn/repo-packages');
const babel = require('@babel/core');
const peggy = require('@kbn/peggy');
const { REPO_ROOT, UPSTREAM_BRANCH } = require('@kbn/repo-info');
const { getBabelOptions } = require('@kbn/babel-transform');

/**
 * @babel/register uses a JSON encoded copy of the config + babel.version
 * as the cache key for files, so we do something similar but we don't need
 * a unique cache key for every file as our config isn't different for
 * different files (by design). Instead we determine a unique prefix and
 * automatically prepend all paths with the prefix to create cache keys
 */
function determineCachePrefix() {
  const json = JSON.stringify({
    synthPkgMapHash: readHashOfPackageMap(),
    babelVersion: babel.version,
    peggyVersion: peggy.version,
    // get a config for a fake js, ts, and tsx file to make sure we
    // capture conditional config portions based on the file extension
    js: babel.loadOptions(getBabelOptions(Path.resolve('foo.js'))),
    ts: babel.loadOptions(getBabelOptions(Path.resolve('foo.ts'))),
    tsx: babel.loadOptions(getBabelOptions(Path.resolve('foo.tsx'))),
  });

  return Crypto.createHash('sha256').update(json).digest('hex').slice(0, 10);
}

function lmdbAvailable() {
  try {
    require('lmdb');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * @returns {import('./types').Cache}
 */
function getCache() {
  const log = process.env.DEBUG_BABEL_REGISTER_CACHE
    ? Fs.createWriteStream('babel_register_cache.log', { flags: 'a' })
    : undefined;

  if (process.env.DISABLE_BABEL_REGISTER_CACHE) {
    log?.end('lmdb cache is disabled\n');
    return new (require('./no_cache_cache').NoCacheCache)();
  }

  if (lmdbAvailable()) {
    log?.write('lmdb is available, using lmdb cache\n');
    return new (require('./lmdb_cache').LmdbCache)({
      pathRoot: REPO_ROOT,
      dir: Path.resolve(REPO_ROOT, 'data/babel_register_cache_v1', UPSTREAM_BRANCH),
      prefix: determineCachePrefix(),
      log,
    });
  }

  log?.end('lmdb is unavailable, disabling cache\n');
  console.error('unable to load LMDB in this env, disabling babel/register cache');
  return new (require('./no_cache_cache').NoCacheCache)();
}

module.exports = {
  getCache,
};
