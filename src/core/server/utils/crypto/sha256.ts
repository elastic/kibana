/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import crypto, { BinaryToTextEncoding } from 'crypto';

export const createSHA256Hash = (
  input: string | Buffer,
  outputEncoding: BinaryToTextEncoding = 'hex'
) => {
  let data: Buffer;
  if (typeof input === 'string') {
    data = Buffer.from(input, 'utf8');
  } else {
    data = input;
  }
  return crypto.createHash('sha256').update(data).digest(outputEncoding);
};
