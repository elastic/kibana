/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// eslint-disable-next-line max-classes-per-file
import { CborEncoderStable, CborDecoder } from '@jsonjoy.com/json-pack/lib/cbor';

// json-pack detects binaries via `instanceof Uint8Array`, which fails across realms (e.g. Jest),
// and silently writes unknown values as null.
class BufferAwareCborEncoder extends CborEncoderStable {
  writeUnknown(value: unknown): void {
    if (Buffer.isBuffer(value)) {
      this.writeBin(value);
    } else {
      throw new TypeError(
        `Cannot CBOR-encode value of type ${Object.prototype.toString.call(value)}`
      );
    }
  }
}

const encoder = new BufferAwareCborEncoder();
const decoder = new CborDecoder();

export class KbnCbor {
  static encode(data: unknown): Buffer {
    const encoded = encoder.encode(data);
    return Buffer.from(encoded.buffer, encoded.byteOffset, encoded.byteLength);
  }

  // Decoding a Buffer yields Buffer byte strings, matching what callers got from borc.
  static decode(input: Buffer | Uint8Array): unknown {
    return decoder.decode(
      Buffer.isBuffer(input) ? input : Buffer.from(input.buffer, input.byteOffset, input.byteLength)
    );
  }
}

export const encode = KbnCbor.encode;
export const decode = KbnCbor.decode;
