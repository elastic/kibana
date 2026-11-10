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
const { DatabaseSync } = require('node:sqlite');

const chalk = require('chalk');

const GLOBAL_ATIME = new Date().setHours(0, 0, 0, 0);
const MINUTE = 1000 * 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;
const ATIME_REFRESH_INTERVAL = 7 * DAY;
const ATIME_LIMIT = 30 * DAY;
const PRUNE_INTERVAL = 7 * DAY;
// parallel processes (CI, scripts/check) share the db; writers wait for each other instead of failing
const BUSY_TIMEOUT_MS = 10_000;
const DB_FILE = 'v3.sqlite';

/** @typedef {import('./types').Cache} CacheInterface */
/** @typedef {import('node:sqlite').StatementSync} Statement */

/**
 * Transpilation cache backed by a single SQLite file shared by all processes on the branch.
 * @implements {CacheInterface}
 */
class SqliteCache {
  /** @type {DatabaseSync} */
  #db;
  /** @type {{ getCode: Statement, getMap: Statement, put: Statement, touch: Statement }} */
  #statements;
  /** @type {Array<{ key: string, statement: Statement, params: Array<string | number | null> }>} */
  #pending = [];
  /** @type {Promise<void> | undefined} */
  #scheduledFlush;
  #flushOnExit = () => this.#flushPending();
  /** @type {boolean} */
  #closed = false;
  /** @type {import('stream').Writable | undefined} */
  #log;
  /** @type {string} */
  #prefix;

  /**
   * @param {import('./types').CacheConfig} config
   */
  constructor(config) {
    this.#log = config.log;
    this.#prefix = config.prefix;

    Fs.mkdirSync(config.dir, { recursive: true });
    this.#db = new DatabaseSync(Path.resolve(config.dir, DB_FILE), { timeout: BUSY_TIMEOUT_MS });
    this.#db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, atime INTEGER NOT NULL, code TEXT NOT NULL, map TEXT);
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value INTEGER NOT NULL);
    `);
    this.#statements = {
      getCode: this.#db.prepare('SELECT atime, code FROM cache WHERE key = ?'),
      getMap: this.#db.prepare('SELECT map FROM cache WHERE key = ? AND map IS NOT NULL'),
      put: this.#db.prepare(
        'INSERT OR REPLACE INTO cache (key, atime, code, map) VALUES (?, ?, ?, ?)'
      ),
      touch: this.#db.prepare('UPDATE cache SET atime = ? WHERE key = ?'),
    };

    this.#pruneIfDue(config.dir);
    process.once('exit', this.#flushOnExit);
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
    const row = this.#safeGet('code', this.#statements.getCode, key);
    if (!row) {
      return undefined;
    }

    if (Number(row.atime) < GLOBAL_ATIME - ATIME_REFRESH_INTERVAL) {
      void this.#queueWrite(key, this.#statements.touch, [GLOBAL_ATIME, key]);
    }

    return String(row.code);
  }

  /**
   * @param {string} key
   * @returns {object|undefined}
   */
  getSourceMap(key) {
    const row = this.#safeGet('map', this.#statements.getMap, key);
    return row ? JSON.parse(String(row.map)) : undefined;
  }

  /**
   * @param {string} key
   * @param {{ code: string, map?: object | null }} entry
   * @returns {Promise<void>}
   */
  update(key, entry) {
    return this.#queueWrite(key, this.#statements.put, [
      key,
      GLOBAL_ATIME,
      entry.code,
      entry.map ? JSON.stringify(entry.map) : null,
    ]);
  }

  /**
   * @returns {Promise<void>}
   */
  close() {
    if (this.#closed) {
      return Promise.resolve();
    }

    this.#flushPending();
    this.#closed = true;
    process.removeListener('exit', this.#flushOnExit);
    try {
      this.#db.close();
    } catch (error) {
      this.#logError('CLOSE', '', error);
    }
    return Promise.resolve();
  }

  /**
   * @param {string} key
   * @param {Statement} statement
   * @param {Array<string | number | null>} params
   * @returns {Promise<void>}
   */
  #queueWrite(key, statement, params) {
    if (this.#closed) {
      return Promise.resolve();
    }

    this.#pending.push({ key, statement, params });
    this.#scheduledFlush ??= new Promise((resolve) => {
      setImmediate(() => {
        this.#flushPending();
        resolve();
      });
    });
    return this.#scheduledFlush;
  }

  /** writes all queued entries in a single transaction */
  #flushPending() {
    this.#scheduledFlush = undefined;
    const batch = this.#pending.splice(0);
    if (this.#closed || !batch.length) {
      return;
    }

    try {
      this.#db.exec('BEGIN IMMEDIATE');
      for (const { statement, params } of batch) {
        statement.run(...params);
      }
      this.#db.exec('COMMIT');
      for (const { key } of batch) {
        this.#debug('PUT', key);
      }
    } catch (error) {
      if (this.#db.isTransaction) {
        this.#db.exec('ROLLBACK');
      }
      this.#logError('PUT', batch.map(({ key }) => key).join(', '), error);
    }
  }

  /**
   * @param {'code' | 'map'} kind
   * @param {Statement} statement
   * @param {string} key
   * @returns {Record<string, unknown> | undefined}
   */
  #safeGet(kind, statement, key) {
    try {
      const row = /** @type {Record<string, unknown> | undefined} */ (statement.get(key));
      this.#debug(row ? `HIT ${kind}` : `MISS ${kind}`, key);
      return row;
    } catch (error) {
      this.#logError('GET', key, error);
      return undefined;
    }
  }

  /**
   * @param {string} dir
   */
  #pruneIfDue(dir) {
    const lastPrune = this.#db.prepare("SELECT value FROM meta WHERE key = 'lastPrune'").get();
    if (lastPrune && Number(lastPrune.value) >= GLOBAL_ATIME - PRUNE_INTERVAL) {
      return;
    }

    try {
      this.#db.prepare('DELETE FROM cache WHERE atime < ?').run(Date.now() - ATIME_LIMIT);
    } catch (error) {
      process.stderr.write(`
Failed to cleanup @kbn/swc-register cache:

  ${error.stack.split('\n').join('\n  ')}

To eliminate this problem you may want to delete the "${Path.relative(process.cwd(), dir)}"
directory and report this error to the Operations team.\n`);
    } finally {
      this.#db
        .prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('lastPrune', ?)")
        .run(GLOBAL_ATIME);
    }
  }

  /**
   * @param {string} type
   * @param {string} key
   */
  #debug(type, key) {
    this.#log?.write(`${type}   ${key}\n`);
  }

  /**
   * @param {'GET' | 'PUT' | 'CLOSE'} type
   * @param {string} key
   * @param {Error} error
   */
  #logError(type, key, error) {
    this.#debug(`ERROR/${type}`, `${key}: ${error.stack}`);
    process.stderr.write(chalk.red(`[@kbn/swc-register] ${type} error [${key}]: ${error.stack}\n`));
  }
}

/**
 * @param {string} prefix
 * @param {string} path
 * @param {string} source
 * @returns {string}
 */
function getHashCacheKey(prefix, path, source) {
  return `${prefix}:${Crypto.createHash('sha256').update(path).update(source).digest('hex')}`;
}

/**
 * @param {string} prefix
 * @param {string} path
 * @returns {string | undefined}
 */
function getMetadataCacheKey(prefix, path) {
  let stat;
  try {
    stat = Fs.statSync(path, { bigint: true });
  } catch {
    return undefined;
  }

  const keyParts = [stat.dev, stat.ino, stat.mode, stat.size, stat.mtimeNs, stat.ctimeNs].map(
    getStatValue
  );

  if (keyParts.some((part) => part === undefined)) {
    return undefined;
  }

  return `${prefix}:stat:${keyParts.join(':')}:${Path.resolve(path)}`;
}

/**
 * @param {bigint | number} value
 * @returns {string | undefined}
 */
function getStatValue(value) {
  if (typeof value === 'bigint') {
    return value.toString();
  }

  return Number.isFinite(value) ? String(value) : undefined;
}

exports.SqliteCache = SqliteCache;
