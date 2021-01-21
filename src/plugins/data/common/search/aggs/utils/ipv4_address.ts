/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

const NUM_BYTES = 4;
const BYTE_SIZE = 256;

function throwError(ipAddress: string | number) {
  throw Error('Invalid IPv4 address: ' + ipAddress);
}

function isIntegerInRange(integer: number, min: number, max: number) {
  return (
    !isNaN(integer as number) && integer >= min && integer < max && (integer as number) % 1 === 0
  );
}

export class Ipv4Address {
  private value: number;

  constructor(ipAddress: string | number) {
    if (typeof ipAddress === 'string') {
      this.value = 0;

      const bytes = ipAddress.split('.');
      if (bytes.length !== NUM_BYTES) {
        throwError(ipAddress);
      }

      for (let i = 0; i < bytes.length; i++) {
        const byte = Number(bytes[i]);
        if (!isIntegerInRange(byte, 0, BYTE_SIZE)) {
          throwError(ipAddress);
        }
        this.value += Math.pow(BYTE_SIZE, NUM_BYTES - 1 - i) * byte;
      }
    } else {
      this.value = ipAddress;
    }

    if (!isIntegerInRange(this.value, 0, Math.pow(BYTE_SIZE, NUM_BYTES))) {
      throwError(ipAddress);
    }
  }

  public toString() {
    let value = this.value;
    const bytes = [];
    for (let i = 0; i < NUM_BYTES; i++) {
      bytes.unshift(value % 256);
      value = Math.floor(value / 256);
    }
    return bytes.join('.');
  }

  public valueOf() {
    return this.value;
  }
}
