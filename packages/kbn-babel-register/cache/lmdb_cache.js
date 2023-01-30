/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const Path = require('path');

const chalk = require('chalk');
const LmdbStore = require('lmdb');

const GLOBAL_ATIME = `${Date.now()}`;
const MINUTE = 1000 * 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;

/** @typedef {import('./types').Cache} CacheInterface */
/** @typedef {import('lmdb').Database<string, string>} Db */

/**
 * @param {Db} db
 * @returns {string}
 */
const dbName = (db) =>
  // @ts-expect-error db.name is not a documented/typed property
  db.name;

/**
 * @implements {CacheInterface}
 */
class LmdbCache {
  /** @type {import('lmdb').RootDatabase<string, string>} */
  #codes;
  /** @type {Db} */
  #atimes;
  /** @type {Db} */
  #mtimes;
  /** @type {Db} */
  #sourceMaps;
  /** @type {string} */
  #pathRoot;
  /** @type {string} */
  #prefix;
  /** @type {import('stream').Writable | undefined} */
  #log;
  /** @type {ReturnType<typeof setTimeout>} */
  #timer;

  /**
   * @param {import('./types').CacheConfig} config
   */
  constructor(config) {
    if (!Path.isAbsolute(config.pathRoot)) {
      throw new Error('cache requires an absolute path to resolve paths relative to');
    }

    this.#pathRoot = config.pathRoot;
    this.#prefix = config.prefix;
    this.#log = config.log;

    this.#codes = LmdbStore.open(config.dir, {
      name: 'codes',
      encoding: 'string',
      maxReaders: 500,
    });

    // TODO: redundant 'name' syntax is necessary because of a bug that I have yet to fix
    this.#atimes = this.#codes.openDB('atimes', {
      name: 'atimes',
      encoding: 'string',
    });

    this.#mtimes = this.#codes.openDB('mtimes', {
      name: 'mtimes',
      encoding: 'string',
    });

    this.#sourceMaps = this.#codes.openDB('sourceMaps', {
      name: 'sourceMaps',
      encoding: 'string',
    });

    // after the process has been running for 30 minutes prune the
    // keys which haven't been used in 30 days. We use `unref()` to
    // make sure this timer doesn't hold other processes open
    // unexpectedly
    this.#timer = setTimeout(() => {
      this.#pruneOldKeys().catch((error) => {
        process.stderr.write(`
Failed to cleanup @kbn/babel-register cache:

  ${error.stack.split('\n').join('\n  ')}

To eliminate this problem you may want to delete the "${Path.relative(process.cwd(), config.dir)}"
directory and report this error to the Operations team.\n`);
      });
    }, 30 * MINUTE);

    // timer.unref is not defined in jest which emulates the dom by default
    if (typeof this.#timer.unref === 'function') {
      this.#timer.unref();
    }
  }

  /**
   * @param {string} path
   */
  getMtime(path) {
    return this.#safeGet(this.#mtimes, this.#getKey(path));
  }

  /**
   * @param {string} path
   */
  getCode(path) {
    const key = this.#getKey(path);
    const code = this.#safeGet(this.#codes, key);

    if (code !== undefined) {
      // when we use a file from the cache set the "atime" of that cache entry
      // so that we know which cache items we use and which haven't been
      // touched in a long time (currently 30 days)
      this.#safePut(this.#atimes, key, GLOBAL_ATIME);
    }

    return code;
  }

  /**
   * @param {string} path
   */
  getSourceMap(path) {
    const map = this.#safeGet(this.#sourceMaps, this.#getKey(path));
    if (typeof map === 'string') {
      return JSON.parse(map);
    }
  }

  close() {
    clearTimeout(this.#timer);
  }

  /**
   * @param {string} path
   * @param {{ mtime: string; code: string; map?: any }} file
   */
  async update(path, file) {
    const key = this.#getKey(path);

    this.#safePut(this.#atimes, key, GLOBAL_ATIME);
    this.#safePut(this.#mtimes, key, file.mtime);
    this.#safePut(this.#codes, key, file.code);

    if (file.map) {
      this.#safePut(this.#sourceMaps, key, JSON.stringify(file.map));
    }
  }

  /**
   * @param {string} path
   */
  #getKey(path) {
    const normalizedPath =
      Path.sep !== '/'
        ? Path.relative(this.#pathRoot, path).split(Path.sep).join('/')
        : Path.relative(this.#pathRoot, path);

    return `${this.#prefix}:${normalizedPath}`;
  }

  /**
   * @param {LmdbStore.Database<string, string>} db
   * @param {string} key
   */
  #safeGet(db, key) {
    try {
      const value = db.get(key);
      this.#debug(value === undefined ? 'MISS' : 'HIT', db, key);
      return value;
    } catch (error) {
      if (error.message.includes('No transaction to renew')) {
        // this happens on errors very early in the process
        return undefined;
      }

      this.#logError('GET', db, key, error);
    }
  }

  /**
   * @param {LmdbStore.Database<string, string>} db
   * @param {string} key
   * @param {string} value
   */
  #safePut(db, key, value) {
    try {
      db.putSync(key, value);
      this.#debug('PUT', db, key);
    } catch (error) {
      this.#logError('PUT', db, key, error);
    }
  }

  /**
   * @param {string} type
   * @param {LmdbStore.Database<string, string>} db
   * @param {string} key
   */
  #debug(type, db, key) {
    this.#log?.write(`${type}   [${dbName(db)}]   ${String(key)}\n`);
  }

  /**
   * @param {'GET' | 'PUT'} type
   * @param {LmdbStore.Database<string, string>} db
   * @param {string} key
   * @param {Error} error
   */
  #logError(type, db, key, error) {
    this.#debug(`ERROR/${type}`, db, `${String(key)}: ${error.stack}`);
    process.stderr.write(
      chalk.red(
        `[@kbn/optimizer/node] ${type} error [${dbName(db)}/${String(key)}]: ${error.stack}\n`
      )
    );
  }

  async #pruneOldKeys() {
    try {
      const ATIME_LIMIT = Date.now() - 30 * DAY;
      const BATCH_SIZE = 1000;

      /** @type {string[]} */
      const validKeys = [];
      /** @type {string[]} */
      const invalidKeys = [];

      for (const { key, value } of this.#atimes.getRange()) {
        const atime = parseInt(`${value}`, 10);
        if (Number.isNaN(atime) || atime < ATIME_LIMIT) {
          invalidKeys.push(key);
        } else {
          validKeys.push(key);
        }

        if (validKeys.length + invalidKeys.length >= BATCH_SIZE) {
          const promises = new Set();

          if (invalidKeys.length) {
            for (const k of invalidKeys) {
              // all these promises are the same currently, so Set() will
              // optimise this to a single promise, but I wouldn't be shocked
              // if a future version starts returning independent promises so
              // this is just for some future-proofing
              promises.add(this.#atimes.remove(k));
              promises.add(this.#mtimes.remove(k));
              promises.add(this.#codes.remove(k));
              promises.add(this.#sourceMaps.remove(k));
            }
          } else {
            // delay a smidge to allow other things to happen before the next batch of checks
            promises.add(new Promise((resolve) => setTimeout(resolve, 1)));
          }

          invalidKeys.length = 0;
          validKeys.length = 0;
          await Promise.all(Array.from(promises));
        }
      }
    } catch {
      // ignore errors, the cache is totally disposable and will rebuild if there is some sort of corruption
    }
  }
}

module.exports = {
  LmdbCache,
};
