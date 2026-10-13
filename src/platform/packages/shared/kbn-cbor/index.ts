/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { encodeOne, decodeFirstSync } from 'cbor';

export class KbnCbor {
  static encode(data: unknown): Buffer {
    return encodeOne(data);
  }

  static decode(input: Buffer | Uint8Array): unknown {
    return decodeFirstSync(input);
  }
}

export const encode = KbnCbor.encode;
export const decode = KbnCbor.decode;
