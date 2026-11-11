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

const { version: swcVersion } = require('@swc/core/package.json');
const { version: peggyVersion } = require('peggy/package.json');

const { REPO_ROOT, UPSTREAM_BRANCH } = require('@kbn/repo-info');
const { getNodeRegisterSwcConfig } = require('@kbn/swc-config/node_register');

/**
 * @param {string} path
 */
function getCachePrefixSwcConfig(path) {
  const config = getNodeRegisterSwcConfig(path, {
    inlineSourceMaps: false,
    inlineSourcesContent: false,
  });

  return {
    swcrc: config.swcrc,
    configFile: config.configFile,
    sourceMaps: config.sourceMaps,
    inlineSourcesContent: config.inlineSourcesContent,
    jsc: config.jsc,
    module: config.module,
  };
}

function determineCachePrefix() {
  const json = JSON.stringify({
    cacheVersion: 1,
    swcVersion,
    peggyVersion,
    js: getCachePrefixSwcConfig('foo.js'),
    ts: getCachePrefixSwcConfig('foo.ts'),
    tsx: getCachePrefixSwcConfig('foo.tsx'),
  });

  return Crypto.hash('sha256', json, 'hex').slice(0, 10);
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
  console.warn(`cache disabled for @kbn/swc-register (${reason})`);
}

/**
 * @returns {import('./types').Cache | undefined}
 */
function getCache() {
  const prefix = determineCachePrefix();
  const log = process.env.DEBUG_SWC_REGISTER_CACHE
    ? Fs.createWriteStream('swc_register_cache.log', { flags: 'a' })
    : undefined;

  if (process.env.DISABLE_SWC_REGISTER_CACHE) {
    log?.end('cache is disabled\n');
    return undefined;
  }

  if (process.env.CODEX_SANDBOX) {
    log?.end('CODEX_SANDBOX is set, disabling cache\n');
    logCacheDisabledOnce('CODEX_SANDBOX is set');
    return undefined;
  }

  const dir = Path.resolve(REPO_ROOT, 'data/swc_register_cache', UPSTREAM_BRANCH);
  try {
    const cache = new (require('./sqlite_cache').SqliteCache)({ dir, prefix, log });
    log?.write('using sqlite cache\n');
    return cache;
  } catch (error) {
    log?.end(`sqlite cache unavailable, disabling cache: ${error.stack}\n`);
    logCacheDisabledOnce(
      `${error.message}; deleting "${Path.relative(process.cwd(), dir)}" may fix this`
    );
    return undefined;
  }
}

module.exports = {
  getCache,
  determineCachePrefix,
};
