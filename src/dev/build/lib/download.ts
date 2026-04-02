/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { openSync, writeSync, unlinkSync, closeSync, statSync } from 'fs';
import { dirname } from 'path';
import { setTimeout } from 'timers/promises';
import { Readable } from 'stream';
import type { ReadableStream as WebReadableStream } from 'stream/web';

import chalk from 'chalk';
import { createHash } from 'crypto';
import type { ToolingLog } from '@kbn/tooling-log';

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

      const response = await fetch(url);

      if (response.status !== 200) {
        throw new Error(`Unexpected status code ${response.status} when downloading ${url}`);
      }

      const hash = createHash(shaAlgorithm);
      let bytesWritten = 0;

      const nodeStream = Readable.fromWeb(response.body! as unknown as WebReadableStream);

      await new Promise<void>((resolve, reject) => {
        nodeStream.on('data', (chunk: Buffer) => {
          if (!skipChecksumCheck) {
            hash.update(chunk);
          }

          const bytes = writeSync(fileHandle, chunk);
          bytesWritten += bytes;
        });

        nodeStream.on('error', reject);
        nodeStream.on('end', () => {
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
            `Downloaded checksum ${downloadedSha} does not match the expected (${shaAlgorithm}) checksum ${shaChecksum}, for file: ${url}.`
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

      const resp = await fetch(url);

      if (expectStatus && resp.status !== expectStatus) {
        const body = await resp.text();
        const error = new Error(`Request failed with status code ${resp.status}`);
        (error as any).response = { status: resp.status, statusText: resp.statusText, data: body };
        throw error;
      }

      if (!resp.ok) {
        const body = await resp.text();
        const error = new Error(`Request failed with status code ${resp.status}`);
        (error as any).response = { status: resp.status, statusText: resp.statusText, data: body };
        throw error;
      }

      const data = await resp.text();
      log.success(`Downloaded [${url}]`);
      return data;
    } catch (error) {
      log.warning(`Download failed: ${error.message}`);
      if (error.response && error.response.status !== undefined) {
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
