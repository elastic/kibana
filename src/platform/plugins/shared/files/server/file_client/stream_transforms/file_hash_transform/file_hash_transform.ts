/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Transform, type TransformCallback } from 'stream';
import { createHash, type Hash } from 'crypto';
import { SupportedFileHashAlgorithm } from '../../../saved_objects/file';

class FileHashTransform extends Transform {
  private readonly hash: Hash;
  private isFinished = false;
  private hashValue: string | undefined = undefined;

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

    if (!this.hashValue) {
      this.hashValue = this.hash.digest('hex');
    }

    return {
      algorithm: this.algorithm,
      value: this.hashValue,
    };
  }
}

/**
 * Creates a `Transform` that will calculate a Hash based on the data provided by a Readable
 * @param algorithm
 */
export const createFileHashTransform = (
  algorithm: SupportedFileHashAlgorithm = 'sha256'
): FileHashTransform => {
  return new FileHashTransform(algorithm);
};

/**
 * Type guard to check of a given Transform is a `FileHashTransform`
 * @param transform
 */
export const isFileHashTransform = (transform: Transform): transform is FileHashTransform => {
  return transform instanceof FileHashTransform;
};
