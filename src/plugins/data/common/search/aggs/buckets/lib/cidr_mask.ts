/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Ipv4Address } from '../../utils';

const NUM_BITS = 32;

function throwError(mask: string) {
  throw Error('Invalid CIDR mask: ' + mask);
}

export class CidrMask {
  public readonly initialAddress: Ipv4Address;
  public readonly prefixLength: number;

  constructor(mask: string) {
    const splits = mask.split('/');
    if (splits.length !== 2) {
      throwError(mask);
    }
    this.initialAddress = new Ipv4Address(splits[0]);
    this.prefixLength = Number(splits[1]);
    if (isNaN(this.prefixLength) || this.prefixLength < 1 || this.prefixLength > NUM_BITS) {
      throwError(mask);
    }
  }

  public getRange() {
    const variableBits = NUM_BITS - this.prefixLength;
    // eslint-disable-next-line no-bitwise
    const fromAddress = ((this.initialAddress.valueOf() >> variableBits) << variableBits) >>> 0; // >>> 0 coerces to unsigned
    const numAddresses = Math.pow(2, variableBits);
    return {
      from: new Ipv4Address(fromAddress).toString(),
      to: new Ipv4Address(fromAddress + numAddresses - 1).toString(),
    };
  }

  public toString() {
    return this.initialAddress.toString() + '/' + this.prefixLength;
  }
}
