/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Transform, type TransformCallback } from 'stream';
import { createHash, type Hash } from 'crypto';

type SupportedFileHashAlgorithm = 'md5' | 'sha1' | 'sha256' | 'sha512';

class FileHashTransform extends Transform {
  private readonly hash: Hash;
  private isFinished = false;

  constructor(private readonly algorithm: SupportedFileHashAlgorithm = 'sha256') {
    super();
    this.hash = createHash(this.algorithm);

    this.once('finish', () => {
      this.isFinished = true;
    });
  }

  _transform(chunk: Buffer, _: BufferEncoding, next: TransformCallback) {
    if (!Buffer.isBuffer(chunk)) {
      throw new Error(`Received a non-buffer chunk. All chunk must be buffers.`);
    }

    if (chunk !== null) {
      this.hash.update(chunk);
    }

    next(null, chunk);
  }

  public getFileHash(): { algorithm: SupportedFileHashAlgorithm; value: string } {
    if (!this.isFinished) {
      throw new Error('File hash generation not yet complete');
    }

    return {
      algorithm: this.algorithm,
      value: this.hash.digest('hex'),
    };
  }
}

/**
 * Creates a `Transform` that will calculate a Hash based on the data provided by a Readable
 * @param algorithm
 */
export const createFileHashTransform = (algorithm: SupportedFileHashAlgorithm = 'sha256') => {
  return new FileHashTransform(algorithm);
};
