/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';
import { pipeline } from 'stream/promises';
import { createHash } from 'crypto';
import { asyncMapWithLimit, asyncForEachWithLimit } from '@kbn/std';

export class Hashes {
  static async hashFile(path: string) {
    const hash = createHash('sha256');
    try {
      await pipeline(Fs.createReadStream(path), hash);
      return hash.digest('hex');
    } catch (error) {
      if (error && error.code === 'ENOENT') {
        return null;
      }

      throw error;
    }
  }

  static hash(content: Buffer) {
    return createHash('sha256').update(content).digest('hex');
  }

  static async ofFiles(paths: string[]) {
    return new Hashes(
      new Map(
        await asyncMapWithLimit(paths, 100, async (path) => {
          return [path, await Hashes.hashFile(path)];
        })
      )
    );
  }

  constructor(public readonly cache = new Map<string, string | null>()) {}

  async populate(paths: string[]) {
    await asyncForEachWithLimit(paths, 100, async (path) => {
      if (!this.cache.has(path)) {
        this.cache.set(path, await Hashes.hashFile(path));
      }
    });
  }

  getCached(path: string) {
    const cached = this.cache.get(path);
    if (cached === undefined) {
      throw new Error(`hash for path [${path}] is not cached`);
    }
    return cached;
  }

  cacheToJson() {
    return Object.fromEntries(
      Array.from(this.cache.entries()).filter((e): e is [string, string] => e[1] !== null)
    );
  }
}
