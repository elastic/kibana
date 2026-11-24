/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const Fs = require('fs');
const Path = require('path');
const Crypto = require('crypto');

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

/** @type {boolean} */
let cacheDisabledLogged = false;

/**
 * @param {string} reason
 */
function logCacheDisabledOnce(reason) {
  if (cacheDisabledLogged) {
    return;
  }

  cacheDisabledLogged = true;
  console.warn(`cache disabled for @kbn/babel-register (${reason})`);
}

/**
 * @returns {import('./types').Cache}
 */
function getCache() {
  const log = process.env.DEBUG_BABEL_REGISTER_CACHE
    ? Fs.createWriteStream('babel_register_cache.log', { flags: 'a' })
    : undefined;

  if (process.env.DISABLE_BABEL_REGISTER_CACHE) {
    log?.end('cache is disabled\n');
    return new (require('./no_cache_cache').NoCacheCache)();
  }

  if (process.env.CODEX_SANDBOX) {
    log?.end('CODEX_SANDBOX is set, disabling cache\n');
    logCacheDisabledOnce('CODEX_SANDBOX is set');
    return new (require('./no_cache_cache').NoCacheCache)();
  }

  const dir = Path.resolve(REPO_ROOT, 'data/babel_register_cache', UPSTREAM_BRANCH);
  try {
    const cache = new (require('./sqlite_cache').SqliteCache)({
      dir,
      prefix: determineCachePrefix(),
      log,
    });
    log?.write('using sqlite cache\n');
    return cache;
  } catch (error) {
    log?.end(`sqlite cache unavailable, disabling cache: ${error.stack}\n`);
    logCacheDisabledOnce(
      `${error.message}; deleting "${Path.relative(process.cwd(), dir)}" may fix this`
    );
    return new (require('./no_cache_cache').NoCacheCache)();
  }
}

module.exports = {
  getCache,
};
