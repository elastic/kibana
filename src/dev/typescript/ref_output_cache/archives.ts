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

import { ToolingLog } from '@kbn/dev-utils';
import Axios from 'axios';

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
      const time = Math.max(s.atimeMs, s.ctimeMs, s.mtimeMs);
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

  async cleanup() {
    // sort archives by time desc
    const archives = Array.from(this.bySha.values()).sort((a, b) => b.time - a.time);

    // delete the 11th+ archive
    for (const { sha, path } of archives.slice(10)) {
      await Fs.unlink(path);
      this.bySha.delete(sha);
    }
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

    try {
      const filename = `${sha}.zip`;
      const target = Path.resolve(this.workDir, 'archives', `${filename}`);
      const resp = await Axios.request({
        url,
        responseType: 'stream',
        adapter: AxiosHttpAdapter,
      });

      await Fs.mkdir(Path.dirname(target), { recursive: true });
      await asyncPipeline(resp.data, createWriteStream(`${target}.tmp`));
      this.log.debug('download complete, renaming tmp');

      await Fs.rename(`${target}.tmp`, target);
      this.bySha.set(sha, {
        sha,
        path: target,
        time: Date.now(),
      });

      this.log.debug('download of cache for', sha, 'complete');
      return true;
    } catch (error) {
      if (!error.response) {
        this.log.debug(`failed to download cache, ignoring error`, error);
        return false;
      }

      if (error.response.status === 404) {
        return false;
      }

      this.log.debug(`failed to download cache,`, error.response.status, 'response');
    }
  }

  async getFirstAvailable(shas: string[]): Promise<Archive | undefined> {
    if (!shas.length) {
      throw new Error('no possible shas to pick archive from');
    }

    const [sha, ...otherShas] = shas;
    let archive = this.bySha.get(sha);

    // try to download the top sha in the list
    if (!archive && (await this.attemptToDownload(sha))) {
      archive = this.bySha.get(sha);
    }

    if (archive) {
      return archive;
    }

    // try the next sha in the list or give up
    this.log.debug('no archive available for', sha);
    return otherShas.length ? this.getFirstAvailable(otherShas) : undefined;
  }
}
