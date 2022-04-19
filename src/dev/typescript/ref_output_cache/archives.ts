/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs/promises';
import { createWriteStream } from 'fs';
import Path from 'path';
import { promisify } from 'util';
import { pipeline } from 'stream';

import { ToolingLog } from '@kbn/tooling-log';
import Axios from 'axios';
import del from 'del';

// https://github.com/axios/axios/tree/ffea03453f77a8176c51554d5f6c3c6829294649/lib/adapters
// @ts-expect-error untyped internal module used to prevent axios from using xhr adapter in tests
import AxiosHttpAdapter from 'axios/lib/adapters/http';

interface Archive {
  sha: string;
  path: string;
  time: number;
}

const asyncPipeline = promisify(pipeline);

async function getCacheNames(cacheDir: string) {
  try {
    return await Fs.readdir(cacheDir);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

export class Archives {
  static async create(log: ToolingLog, workingDir: string) {
    const dir = Path.resolve(workingDir, 'archives');
    const bySha = new Map<string, Archive>();

    for (const name of await getCacheNames(dir)) {
      const path = Path.resolve(dir, name);

      if (!name.endsWith('.zip')) {
        log.debug('deleting unexpected file in archives dir', path);
        await Fs.unlink(path);
        continue;
      }

      const sha = name.replace('.zip', '');
      log.verbose('identified archive for', sha);
      const s = await Fs.stat(path);
      const time = Math.max(s.atimeMs, s.mtimeMs);
      bySha.set(sha, {
        path,
        time,
        sha,
      });
    }

    return new Archives(log, workingDir, bySha);
  }

  protected constructor(
    private readonly log: ToolingLog,
    private readonly workDir: string,
    private readonly bySha: Map<string, Archive>
  ) {}

  size() {
    return this.bySha.size;
  }

  get(sha: string) {
    return this.bySha.get(sha);
  }

  async delete(sha: string) {
    const archive = this.get(sha);
    if (archive) {
      await Fs.unlink(archive.path);
      this.bySha.delete(sha);
    }
  }

  *[Symbol.iterator]() {
    yield* this.bySha.values();
  }

  /**
   * Attempt to download the cache for a given sha, adding it to this.bySha
   * and returning true if successful, logging and returning false otherwise.
   *
   * @param sha the commit sha we should try to download the cache for
   */
  async attemptToDownload(sha: string) {
    if (this.bySha.has(sha)) {
      return true;
    }

    const url = `https://ts-refs-cache.kibana.dev/${sha}.zip`;
    this.log.debug('attempting to download cache for', sha, 'from', url);

    const filename = `${sha}.zip`;
    const target = Path.resolve(this.workDir, 'archives', `${filename}`);
    const tmpTarget = `${target}.tmp`;

    try {
      const resp = await Axios.request({
        url,
        responseType: 'stream',
        adapter: AxiosHttpAdapter,
      });

      await Fs.mkdir(Path.dirname(target), { recursive: true });
      await asyncPipeline(resp.data, createWriteStream(tmpTarget));
      this.log.debug('download complete, renaming tmp');

      await Fs.rename(tmpTarget, target);
      this.bySha.set(sha, {
        sha,
        path: target,
        time: Date.now(),
      });

      this.log.debug('download of cache for', sha, 'complete');
      return true;
    } catch (error) {
      await del(tmpTarget, { force: true });

      if (!error.response) {
        this.log.debug(`failed to download cache, ignoring error:`, error.message);
        return false;
      }

      if (error.response.status === 404) {
        return false;
      }

      this.log.debug(`failed to download cache,`, error.response.status, 'response');
    }
  }

  /**
   * Iterate through a list of shas, which represent commits
   * on our upstreamBranch, and look for caches which are
   * already downloaded, or try to download them. If the cache
   * for that commit is not available for any reason the next
   * sha will be tried.
   *
   * If we reach the end of the list without any caches being
   * available undefined is returned.
   *
   * @param shas shas for commits to try and find caches for
   */
  async getFirstAvailable(shas: string[]): Promise<Archive | undefined> {
    if (!shas.length) {
      throw new Error('no possible shas to pick archive from');
    }

    for (const sha of shas) {
      let archive = this.bySha.get(sha);

      // if we don't have one locally try to download one
      if (!archive && (await this.attemptToDownload(sha))) {
        archive = this.bySha.get(sha);
      }

      // if we found the archive return it
      if (archive) {
        return archive;
      }

      this.log.debug('no archive available for', sha);
    }

    return undefined;
  }
}
