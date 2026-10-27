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

const chalk = require('chalk');

const { getHashCacheKey, getMetadataCacheKey } = require('./keys');

const DAY = 1000 * 60 * 60 * 24;
const MTIME_REFRESH_INTERVAL = 7 * DAY;
const PRUNE_INTERVAL = 7 * DAY;
const PRUNE_AGE_LIMIT = 30 * DAY;
const PRUNE_MARKER = 'last-clean';
const CODE_EXT = '.code.js';
const MAP_EXT = '.map.json';

/** @typedef {import('./types').Cache} CacheInterface */

/**
 * Plain-filesystem transpile cache used when LMDB cannot be loaded, e.g. under
 * `--disallow-code-generation-from-strings` where lmdb's `ordered-binary`
 * dependency throws at require time. Without any cache the swc transform
 * inlines source maps (including full sources content) into every module,
 * which bloats the dev server heap by hundreds of MB and re-transpiles the
 * whole repo on every boot.
 *
 * Entries are content-addressed: `<dir>/fs1/<sha256(key)[0:2]>/<rest>.code.js`
 * plus an optional sibling `.map.json`. Writes go to a temp file and are
 * renamed into place so concurrent processes never observe partial entries.
 *
 * @implements {CacheInterface}
 */
class FsCache {
  /** @type {string} */
  #dir;
  /** @type {string} */
  #prefix;
  /** @type {import('stream').Writable | undefined} */
  #log;
  /** Resolves once the background prune sweep (if any) finished; for tests. */
  /** @type {Promise<void> | undefined} */
  pruneComplete;

  /**
   * @param {import('./types').CacheConfig} config
   */
  constructor(config) {
    this.#dir = Path.resolve(config.dir, 'fs1');
    this.#prefix = config.prefix;
    this.#log = config.log;

    try {
      Fs.mkdirSync(this.#dir, { recursive: true });
      this.#maybePrune();
    } catch (error) {
      this.#logError('INIT', this.#dir, error);
    }
  }

  /**
   * Get the cache key of the path and source from disk of a file
   * @param {string} path
   * @param {string} source
   * @returns {string}
   */
  getKey(path, source) {
    return getMetadataCacheKey(this.#prefix, path) ?? getHashCacheKey(this.#prefix, path, source);
  }

  /**
   * @param {string} key
   * @returns {string|undefined}
   */
  getCode(key) {
    const path = this.#pathFor(key, CODE_EXT);

    try {
      const code = Fs.readFileSync(path, 'utf8');
      this.#debug('HIT', key);
      this.#maybeRefreshMtime(path);
      return code;
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.#debug('MISS', key);
      } else {
        this.#logError('GET', key, error);
      }
      return undefined;
    }
  }

  /**
   * @param {string} key
   * @returns {object|undefined}
   */
  getSourceMap(key) {
    try {
      return JSON.parse(Fs.readFileSync(this.#pathFor(key, MAP_EXT), 'utf8'));
    } catch {
      return undefined;
    }
  }

  /**
   * @param {string} key
   * @param {{ code: string, map?: object | null }} entry
   * @returns {Promise<void>}
   */
  async update(key, entry) {
    try {
      const codePath = this.#pathFor(key, CODE_EXT);
      await Fs.promises.mkdir(Path.dirname(codePath), { recursive: true });

      const writes = [this.#writeAtomic(codePath, entry.code)];
      if (entry.map) {
        writes.push(this.#writeAtomic(this.#pathFor(key, MAP_EXT), JSON.stringify(entry.map)));
      }

      await Promise.all(writes);
      this.#debug('PUT', key);
    } catch (error) {
      this.#logError('PUT', key, error);
    }
  }

  /**
   * @param {string} key
   * @param {string} ext
   */
  #pathFor(key, ext) {
    const hash = Crypto.hash('sha256', key, 'hex');
    return Path.resolve(this.#dir, hash.slice(0, 2), `${hash.slice(2)}${ext}`);
  }

  /**
   * @param {string} path
   * @param {string} content
   */
  async #writeAtomic(path, content) {
    const tmp = `${path}.${process.pid}.${Crypto.randomBytes(4).toString('hex')}.tmp`;
    await Fs.promises.writeFile(tmp, content);
    await Fs.promises.rename(tmp, path);
  }

  /**
   * mtime doubles as the last-used marker for pruning; bump it at most once
   * per interval so hits stay a single read syscall in the common case.
   * @param {string} path
   */
  #maybeRefreshMtime(path) {
    try {
      const stat = Fs.statSync(path);
      if (Date.now() - stat.mtimeMs > MTIME_REFRESH_INTERVAL) {
        const now = new Date();
        Fs.utimes(path, now, now, () => {});
      }
    } catch {
      // best effort only
    }
  }

  #maybePrune() {
    const marker = Path.resolve(this.#dir, PRUNE_MARKER);

    try {
      if (Date.now() - Fs.statSync(marker).mtimeMs < PRUNE_INTERVAL) {
        return;
      }
    } catch {
      // no marker yet -> prune
    }

    Fs.writeFileSync(marker, '');

    // Best-effort background sweep; never blocks or fails module loading.
    this.pruneComplete = (async () => {
      const ageLimit = Date.now() - PRUNE_AGE_LIMIT;
      const subdirs = await Fs.promises.readdir(this.#dir, { withFileTypes: true });

      for (const subdir of subdirs) {
        if (!subdir.isDirectory()) {
          continue;
        }

        const dirPath = Path.resolve(this.#dir, subdir.name);
        for (const name of await Fs.promises.readdir(dirPath)) {
          const filePath = Path.resolve(dirPath, name);
          try {
            const stat = await Fs.promises.stat(filePath);
            if (stat.mtimeMs < ageLimit || name.endsWith('.tmp')) {
              await Fs.promises.unlink(filePath);
            }
          } catch {
            // raced with another process; ignore
          }
        }
      }
    })().catch((error) => {
      this.#logError('PRUNE', this.#dir, error);
    });
  }

  /**
   * @param {string} type
   * @param {string} key
   */
  #debug(type, key) {
    this.#log?.write(`${type}   [fs]   ${key}\n`);
  }

  /**
   * @param {string} type
   * @param {string} key
   * @param {Error} error
   */
  #logError(type, key, error) {
    this.#debug(`ERROR/${type}`, `${key}: ${error.stack}`);
    process.stderr.write(
      chalk.red(`[@kbn/swc-register] ${type} error [fs/${key}]: ${error.stack}\n`)
    );
  }
}

exports.FsCache = FsCache;
