/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { encode as encodeCbor, decode as decodeCbor, TypeEncoderMap } from 'cbor2';

// cbor2 picks encoders by exact constructor, so without this a Buffer falls through to
// Buffer#toJSON() and is encoded as `{ type: 'Buffer', data: [...] }` instead of a byte string.
const types = new TypeEncoderMap();
types.registerEncoder(Buffer, (buffer: Buffer) => [
  NaN,
  new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength),
]);

export class KbnCbor {
  static encode(data: unknown): Buffer {
    const encoded = encodeCbor(data, { types });
    return Buffer.from(encoded.buffer, encoded.byteOffset, encoded.byteLength);
  }

  // Decoding a Buffer yields Buffer byte strings, matching what callers got from borc.
  static decode(input: Buffer | Uint8Array): unknown {
    return decodeCbor(
      Buffer.isBuffer(input) ? input : Buffer.from(input.buffer, input.byteOffset, input.byteLength)
    );
  }
}

export const encode = KbnCbor.encode;
export const decode = KbnCbor.decode;
