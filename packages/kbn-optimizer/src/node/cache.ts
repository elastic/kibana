/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import Path from 'path';

// @ts-expect-error no types available
import * as LmdbStore from 'lmdb-store';
import { REPO_ROOT, UPSTREAM_BRANCH } from '@kbn/dev-utils';

const CACHE_DIR = Path.resolve(REPO_ROOT, 'data/node_auto_transpilation_cache', UPSTREAM_BRANCH);
const reportError = () => {
  // right now I'm not sure we need to worry about errors, the cache isn't actually
  // necessary, and if the cache is broken it should just rebuild on the next restart
  // of the process. We don't know how often errors occur though and what types of
  // things might fail on different machines so we probably want some way to signal
  // to users that something is wrong
};

const GLOBAL_ATIME = `${Date.now()}`;
const MINUTE = 1000 * 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;

interface Lmdb<T> {
  get(key: string): T | undefined;
  put(key: string, value: T, version?: number, ifVersion?: number): Promise<boolean>;
  remove(key: string, ifVersion?: number): Promise<boolean>;
  openDB<T>(options: { name: string; encoding: 'msgpack' | 'string' | 'json' | 'binary' }): Lmdb<T>;
  getRange(options?: {
    start?: T;
    end?: T;
    reverse?: boolean;
    limit?: number;
    versions?: boolean;
  }): Iterable<{ key: string; value: T }>;
}

export class Cache {
  private readonly codes: Lmdb<string>;
  private readonly atimes: Lmdb<string>;
  private readonly mtimes: Lmdb<string>;
  private readonly sourceMaps: Lmdb<any>;
  private readonly prefix: string;

  constructor(config: { prefix: string }) {
    this.prefix = config.prefix;

    this.codes = LmdbStore.open({
      name: 'codes',
      path: CACHE_DIR,
      maxReaders: 500,
    });

    this.atimes = this.codes.openDB({
      name: 'atimes',
      encoding: 'string',
    });

    this.mtimes = this.codes.openDB({
      name: 'mtimes',
      encoding: 'string',
    });

    this.sourceMaps = this.codes.openDB({
      name: 'sourceMaps',
      encoding: 'msgpack',
    });

    // after the process has been running for 30 minutes prune the
    // keys which haven't been used in 30 days. We use `unref()` to
    // make sure this timer doesn't hold other processes open
    // unexpectedly
    setTimeout(() => {
      this.pruneOldKeys();
    }, 30 * MINUTE).unref();
  }

  getMtime(path: string) {
    return this.mtimes.get(this.getKey(path));
  }

  getCode(path: string) {
    const key = this.getKey(path);

    // when we use a file from the cache set the "atime" of that cache entry
    // so that we know which cache items we use and which haven't been
    // touched in a long time (currently 30 days)
    this.atimes.put(key, GLOBAL_ATIME).catch(reportError);

    return this.codes.get(key);
  }

  getSourceMap(path: string) {
    return this.sourceMaps.get(this.getKey(path));
  }

  update(path: string, file: { mtime: string; code: string; map: any }) {
    const key = this.getKey(path);

    Promise.all([
      this.atimes.put(key, GLOBAL_ATIME),
      this.mtimes.put(key, file.mtime),
      this.codes.put(key, file.code),
      this.sourceMaps.put(key, file.map),
    ]).catch(reportError);
  }

  private getKey(path: string) {
    return `${this.prefix}${path}`;
  }

  private async pruneOldKeys() {
    try {
      const ATIME_LIMIT = Date.now() - 30 * DAY;
      const BATCH_SIZE = 1000;

      const validKeys: string[] = [];
      const invalidKeys: string[] = [];

      for (const { key, value } of this.atimes.getRange()) {
        const atime = parseInt(value, 10);
        if (atime < ATIME_LIMIT) {
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
