/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// import { encode as encodeJS, decode as decodeJS } from 'borc';
import { encode as encodeJS, decodeFirstSync as decodeJS } from 'cbor';

export class KbnCbor {
  static encode(data: unknown) {
    return encodeJS(data);
  }

  static decode(uint8: any) {
    return decodeJS(uint8);
  }
}

export const encode = KbnCbor.encode;
export const decode = KbnCbor.decode;
