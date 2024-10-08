/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// NOTE: This can possibly be replaced with node-cbor using encode, and decodeFirstSync if we do need
// to change into something better maintained but for now we are going to stick with borc as it is
// a little faster
import { encode as encodeJS, decode as decodeJS } from 'borc';

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
