/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Writable } from 'stream';

import chalk from 'chalk';
import * as LmdbStore from 'lmdb-store';

const GLOBAL_ATIME = `${Date.now()}`;
const MINUTE = 1000 * 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;

const dbName = (db: LmdbStore.Database) =>
  // @ts-expect-error db.name is not a documented/typed property
  db.name;

export class Cache {
  private readonly codes: LmdbStore.RootDatabase<string, string>;
  private readonly atimes: LmdbStore.Database<string, string>;
  private readonly mtimes: LmdbStore.Database<string, string>;
  private readonly sourceMaps: LmdbStore.Database<string, string>;
  private readonly prefix: string;
  private readonly log?: Writable;
  private readonly timer: NodeJS.Timer;

  constructor(config: { dir: string; prefix: string; log?: Writable }) {
    this.prefix = config.prefix;
    this.log = config.log;

    this.codes = LmdbStore.open(config.dir, {
      name: 'codes',
      encoding: 'string',
      maxReaders: 500,
    });

    // TODO: redundant 'name' syntax is necessary because of a bug that I have yet to fix
    this.atimes = this.codes.openDB('atimes', {
      name: 'atimes',
      encoding: 'string',
    });

    this.mtimes = this.codes.openDB('mtimes', {
      name: 'mtimes',
      encoding: 'string',
    });

    this.sourceMaps = this.codes.openDB('sourceMaps', {
      name: 'sourceMaps',
      encoding: 'string',
    });

    // after the process has been running for 30 minutes prune the
    // keys which haven't been used in 30 days. We use `unref()` to
    // make sure this timer doesn't hold other processes open
    // unexpectedly
    this.timer = setTimeout(() => {
      this.pruneOldKeys();
    }, 30 * MINUTE);

    // timer.unref is not defined in jest which emulates the dom by default
    if (typeof this.timer.unref === 'function') {
      this.timer.unref();
    }
  }

  getMtime(path: string) {
    return this.safeGet(this.mtimes, this.getKey(path));
  }

  getCode(path: string) {
    const key = this.getKey(path);
    const code = this.safeGet(this.codes, key);

    if (code !== undefined) {
      // when we use a file from the cache set the "atime" of that cache entry
      // so that we know which cache items we use and which haven't been
      // touched in a long time (currently 30 days)
      this.safePut(this.atimes, key, GLOBAL_ATIME);
    }

    return code;
  }

  getSourceMap(path: string) {
    const map = this.safeGet(this.sourceMaps, this.getKey(path));
    if (typeof map === 'string') {
      return JSON.parse(map);
    }
  }

  async update(path: string, file: { mtime: string; code: string; map: any }) {
    const key = this.getKey(path);

    await Promise.all([
      this.safePut(this.atimes, key, GLOBAL_ATIME),
      this.safePut(this.mtimes, key, file.mtime),
      this.safePut(this.codes, key, file.code),
      this.safePut(this.sourceMaps, key, JSON.stringify(file.map)),
    ]);
  }

  close() {
    clearTimeout(this.timer);
  }

  private getKey(path: string) {
    return `${this.prefix}${path}`;
  }

  private safeGet<V>(db: LmdbStore.Database<V, string>, key: string) {
    try {
      const value = db.get(key);
      this.debug(value === undefined ? 'MISS' : 'HIT', db, key);
      return value;
    } catch (error) {
      this.logError('GET', db, key, error);
    }
  }

  private async safePut<V>(db: LmdbStore.Database<V, string>, key: string, value: V) {
    try {
      await db.put(key, value);
      this.debug('PUT', db, key);
    } catch (error) {
      this.logError('PUT', db, key, error);
    }
  }

  private debug(type: string, db: LmdbStore.Database, key: LmdbStore.Key) {
    if (this.log) {
      this.log.write(`${type}   [${dbName(db)}]   ${String(key)}\n`);
    }
  }

  private logError(type: 'GET' | 'PUT', db: LmdbStore.Database, key: LmdbStore.Key, error: Error) {
    this.debug(`ERROR/${type}`, db, `${String(key)}: ${error.stack}`);
    process.stderr.write(
      chalk.red(
        `[@kbn/optimizer/node] ${type} error [${dbName(db)}/${String(key)}]: ${error.stack}\n`
      )
    );
  }

  private async pruneOldKeys() {
    try {
      const ATIME_LIMIT = Date.now() - 30 * DAY;
      const BATCH_SIZE = 1000;

      const validKeys: string[] = [];
      const invalidKeys: string[] = [];

      // @ts-expect-error See https://github.com/DoctorEvidence/lmdb-store/pull/18
      for (const { key, value } of this.atimes.getRange()) {
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
              promises.add(this.atimes.remove(k));
              promises.add(this.mtimes.remove(k));
              promises.add(this.codes.remove(k));
              promises.add(this.sourceMaps.remove(k));
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
