/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CborEncoder, CborDecoder } from '@jsonjoy.com/json-pack/lib/cbor';

export class KbnCbor {
  static encode(data: unknown) {
    const encoder = new CborEncoder();
    return encoder.encode(data);
  }
  
  static decode(uint8: Uint8Array) {
    const decoder = new CborDecoder();
    return decoder.decode(uint8);
  }
}
