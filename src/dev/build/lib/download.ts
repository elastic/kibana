/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { openSync, writeSync, unlinkSync, closeSync, statSync } from 'fs';
import { dirname } from 'path';
import { setTimeout } from 'timers/promises';

import chalk from 'chalk';
import { createHash } from 'crypto';
import Axios from 'axios';
import { ToolingLog, isAxiosResponseError } from '@kbn/dev-utils';

// https://github.com/axios/axios/tree/ffea03453f77a8176c51554d5f6c3c6829294649/lib/adapters
// @ts-expect-error untyped internal module used to prevent axios from using xhr adapter in tests
import AxiosHttpAdapter from 'axios/lib/adapters/http';

import { mkdirp } from './fs';

function tryUnlink(path: string) {
  try {
    unlinkSync(path);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

interface DownloadToDiskOptions {
  log: ToolingLog;
  url: string;
  destination: string;
  shaChecksum: string;
  shaAlgorithm: string;
  maxAttempts?: number;
  retryDelaySecMultiplier?: number;
  skipChecksumCheck?: boolean;
}
export async function downloadToDisk({
  log,
  url,
  destination,
  shaChecksum,
  shaAlgorithm,
  maxAttempts = 1,
  retryDelaySecMultiplier = 5,
  skipChecksumCheck = false,
}: DownloadToDiskOptions) {
  if (!shaChecksum && !skipChecksumCheck) {
    throw new Error(`${shaAlgorithm} checksum of ${url} not provided, refusing to download.`);
  }

  if (maxAttempts < 1) {
    throw new Error(`[maxAttempts=${maxAttempts}] must be >= 1`);
  }

  let attempt = 0;
  while (true) {
    attempt += 1;

    // mkdirp and open file outside of try/catch, we don't retry for those errors
    await mkdirp(dirname(destination));
    const fileHandle = openSync(destination, 'w');

    let error;
    try {
      log.debug(
        `[${attempt}/${maxAttempts}] Attempting download of ${url}`,
        skipChecksumCheck ? '' : chalk.dim(shaAlgorithm)
      );

      const response = await Axios.request({
        url,
        responseType: 'stream',
        adapter: AxiosHttpAdapter,
      });

      if (response.status !== 200) {
        throw new Error(`Unexpected status code ${response.status} when downloading ${url}`);
      }

      const hash = createHash(shaAlgorithm);
      let bytesWritten = 0;

      await new Promise<void>((resolve, reject) => {
        response.data.on('data', (chunk: Buffer) => {
          if (!skipChecksumCheck) {
            hash.update(chunk);
          }

          const bytes = writeSync(fileHandle, chunk);
          bytesWritten += bytes;
        });

        response.data.on('error', reject);
        response.data.on('end', () => {
          if (bytesWritten === 0) {
            return reject(new Error(`No bytes written when downloading ${url}`));
          }

          return resolve();
        });
      });

      if (!skipChecksumCheck) {
        const downloadedSha = hash.digest('hex');
        if (downloadedSha !== shaChecksum) {
          throw new Error(
            `Downloaded checksum ${downloadedSha} does not match the expected ${shaAlgorithm} checksum.`
          );
        }
      }
    } catch (_error) {
      error = _error;
    } finally {
      closeSync(fileHandle);

      const fileStats = statSync(destination);
      log.debug(`Downloaded ${fileStats.size} bytes to ${destination}`);
    }

    if (!error) {
      log.debug(`Downloaded ${url} ${skipChecksumCheck ? '' : 'and verified checksum'}`);
      return;
    }

    log.debug(`Download failed: ${error.message}`);

    // cleanup downloaded data and log error
    log.debug(`Deleting downloaded data at ${destination}`);
    tryUnlink(destination);

    // retry if we have retries left
    if (attempt < maxAttempts) {
      const sec = attempt * retryDelaySecMultiplier;
      log.info(`Retrying in ${sec} seconds`);
      await setTimeout(sec * 1000);
      continue;
    }

    throw error;
  }
}

interface DownloadToStringOptions {
  log: ToolingLog;
  url: string;
  expectStatus?: number;
  maxAttempts?: number;
  retryDelaySecMultiplier?: number;
}
export async function downloadToString({
  log,
  url,
  expectStatus,
  maxAttempts = 3,
  retryDelaySecMultiplier = 5,
}: DownloadToStringOptions) {
  let attempt = 0;
  while (true) {
    try {
      attempt += 1;
      log.debug(`[${attempt}/${maxAttempts}] Attempting download to string of [${url}]`);

      const resp = await Axios.request<string>({
        url,
        method: 'GET',
        adapter: AxiosHttpAdapter,
        responseType: 'text',
        validateStatus: !expectStatus ? undefined : (status) => status === expectStatus,
      });

      log.success(`Downloaded [${url}]`);
      return resp.data;
    } catch (error) {
      log.warning(`Download failed: ${error.message}`);
      if (isAxiosResponseError(error)) {
        log.debug(
          `[${error.response.status}/${error.response.statusText}] response: ${error.response.data}`
        );
      } else {
        log.debug('received no response');
      }

      if ((maxAttempts ?? 3) > attempt) {
        const sec = (retryDelaySecMultiplier ?? 5) * attempt;
        log.info(`Retrying in ${sec} seconds`);
        await setTimeout(sec * 1000);
        continue;
      }

      throw error;
    }
  }
}
