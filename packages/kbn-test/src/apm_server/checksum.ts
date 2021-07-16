/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable max-classes-per-file */

import Fs from 'fs/promises';
import { createReadStream } from 'fs';
import { Transform, Writable } from 'stream';
import Crypto from 'crypto';

import { ToolingLog } from '@kbn/dev-utils';

import { asyncPipeline } from '../utils';
import { ChecksumFile } from './checksum_file';

class Sha512Sink extends Writable {
  private readonly hash = Crypto.createHash('sha512');

  constructor() {
    super({
      write: (chunk, _enc, cb) => {
        this.hash.update(chunk);
        cb();
      },
    });
  }

  getHex() {
    return this.hash.digest('hex');
  }
}

export class Sha512PassThrough extends Transform {
  private readonly hash = Crypto.createHash('sha512');

  constructor() {
    super({
      transform: (chunk, _enc, cb) => {
        this.hash.update(chunk);
        cb(null, chunk);
      },
    });
  }

  getHex() {
    return this.hash.digest('hex');
  }
}

async function deleteWithChecksum(path: string) {
  await Fs.rm(path, { recursive: true, force: true });
  await Fs.rm(`${path}.sha512`, { recursive: true, force: true });
}

/**
 * Validate that a file matches the .sha512 checksum next to it on the FS
 */
export async function isExistingAndValid(
  log: ToolingLog,
  path: string,
  requiredChecksum?: ChecksumFile
) {
  const hasher = new Sha512Sink();
  try {
    await asyncPipeline(createReadStream(path), hasher);
  } catch (error) {
    if (error.code === 'ENOENT') {
      log.debug(`[${path}] does not exist`);
      await deleteWithChecksum(path);
      return false;
    }

    throw error;
  }

  const checksum = hasher.getHex();
  const expectedChecksum = await ChecksumFile.fromArchivePath(log, path);
  if (!expectedChecksum) {
    log.debug(`[${path}.sha512] does not exist`);
    await deleteWithChecksum(path);
    return false;
  }

  if (requiredChecksum && !expectedChecksum.eq(requiredChecksum)) {
    log.debug(`[${path}] does not match required checksum, deleting`);
    await deleteWithChecksum(path);
    return false;
  }

  if (!expectedChecksum.eq(checksum)) {
    log.debug(`[${path}] does not match checksum, deleting`);
    await deleteWithChecksum(path);
    return false;
  }

  log.debug(`[${path}] matches checksum`);
  return true;
}
