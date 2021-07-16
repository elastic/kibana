/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs/promises';
import { createWriteStream } from 'fs';
import { Readable } from 'stream';
import { inspect } from 'util';

import Axios from 'axios';
import {
  ToolingLog,
  isFailError,
  createFailError,
  isAxiosRequestError,
  isAxiosResponseError,
} from '@kbn/dev-utils';
import { asyncPipeline } from '../utils';
import { Sha512PassThrough } from './checksum';
import { ChecksumFile } from './checksum_file';

const MAX_ATTEMPTS = 5;

export async function downloadText(log: ToolingLog, url: string) {
  let attempt = 0;
  while (true) {
    attempt += 1;

    log.debug('GET', url);
    try {
      const resp = await Axios.request<string>({
        url,
        responseType: 'text',
        transformResponse: [(x) => x],
      });
      return resp.data;
    } catch (error) {
      if (!isAxiosResponseError(error) && !isAxiosRequestError(error)) {
        throw error;
      }

      if (isAxiosRequestError(error)) {
        log.warning(`AXIOS REQUEST ERROR: ${error.message}`);
      } else if (isAxiosResponseError(error)) {
        const data = inspect(error.response.data);
        log.warning(
          `ERROR RESPONSE: [${error.response.status} ${error.response.statusText}]\n${data}`
        );

        if (error.response.status < 500) {
          throw new Error(
            `GET [${url}] responded with [${error.response.status} ${error.response.statusText}]`
          );
        }
      }

      if (attempt < MAX_ATTEMPTS) {
        const sec = attempt * 2;
        log.warning('waiting', sec, 'seconds and then retrying');
        await new Promise((resolve) => setTimeout(resolve, sec * 1000));
        continue;
      }

      throw new Error(`Attempted to GET [${url}] ${attempt} times without success, not retrying`);
    }
  }
}

export async function downloadJson(log: ToolingLog, url: string) {
  return JSON.parse(await downloadText(log, url));
}

export async function downloadAndValidate(
  log: ToolingLog,
  options: { url: string; checksum: ChecksumFile; targetPath: string }
) {
  // ensure the parent output directory exists
  await Fs.mkdir(Path.dirname(options.targetPath), { recursive: true });

  log.debug('downloading artifact to', options.targetPath, 'while validating checksum');

  let attempt = 0;
  downloadLoop: while (true) {
    attempt += 1;

    try {
      log.debug('GET', options.url);
      const resp = await Axios.request<Readable>({
        url: options.url,
        responseType: 'stream',
      });

      const hash = new Sha512PassThrough();
      await asyncPipeline(resp.data, hash, createWriteStream(options.targetPath));
      const checksum = hash.getHex();

      if (!options.checksum.eq(checksum)) {
        await Fs.rm(options.targetPath, { force: true });
        throw createFailError(`download of [${options.url}] has an invalid checksum`);
      }

      break downloadLoop;
    } catch (error) {
      if (!isFailError(error) && !isAxiosRequestError(error) && !isAxiosResponseError(error)) {
        throw error;
      }

      if (isAxiosRequestError(error)) {
        log.warning(`AXIOS REQUEST ERROR: ${error.message}`);
      } else if (isAxiosResponseError(error)) {
        const data = inspect(error.response.data);
        log.warning(
          `ERROR RESPONSE: [${error.response.status} ${error.response.statusText}]\n${data}`
        );

        if (error.response.status < 500) {
          throw new Error(
            `GET [${options.url}] responded with [${error.response.status} ${error.response.statusText}]`
          );
        }
      } else if (isFailError(error)) {
        log.warning(`download failure:`, error.message);
      }

      if (attempt < MAX_ATTEMPTS) {
        const sec = attempt * 2;
        log.warning('waiting', sec, 'seconds and then retrying');
        await new Promise((resolve) => setTimeout(resolve, sec * 1000));
        continue downloadLoop;
      }

      throw new Error(
        `Attempted to GET [${options.url}] ${attempt} times without success, not retrying`
      );
    }
  }

  // write the checksum data next to the archive so it can be validate later
  await Fs.writeFile(`${options.targetPath}.sha512`, options.checksum.content);

  log.debug('download of', options.url, 'complete');
}
