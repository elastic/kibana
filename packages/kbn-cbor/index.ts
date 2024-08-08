/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { encode as encodeJS, decode as decodeJS } from 'cborg';

function uint8From(input: any) {
  if (input instanceof Uint8Array) {
    // Input is already a Uint8Array, so just return it
    return new Uint8Array(input); // Create a copy to avoid mutability issues
  } else if (typeof input === 'string') {
    // Input is a string, convert it to a Uint8Array using TextEncoder
    const encoder = new TextEncoder();
    return encoder.encode(input);
  } else if (Array.isArray(input)) {
    // Input is an array, convert it to Uint8Array
    return new Uint8Array(input);
  } else if (input instanceof Buffer) {
    // Input is a Buffer (Node.js specific), convert it to Uint8Array
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  } else if (typeof input === 'number') {
    // Input is a single number, create a Uint8Array with that number (only valid for 0-255)
    if (input < 0 || input > 255) {
      throw new RangeError('Number must be between 0 and 255');
    }
    return new Uint8Array([input]);
  } else if (input instanceof ArrayBuffer) {
    // Input is an ArrayBuffer, convert it to Uint8Array
    return new Uint8Array(input);
  } else if (input && Array.isArray(input.data) && typeof input.data[0] === 'number') {
    // Handle custom object with data property as array of numbers
    return new Uint8Array(input.data);
  } else {
    throw new TypeError('Unsupported input type');
  }
}

export class KbnCbor {
  static encode(data: unknown) {
    return encodeJS(data);
  }

  static decode(uint8: Uint8Array) {
    return decodeJS(uint8From(uint8));
  }
}

export const encode = KbnCbor.encode;
export const decode = KbnCbor.decode;
