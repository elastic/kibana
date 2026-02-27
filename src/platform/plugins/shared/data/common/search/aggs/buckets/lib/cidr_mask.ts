/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import ipaddr from 'ipaddr.js';
import { IpAddress } from '../../utils';

export class CidrMask {
  private static getNetmask(size: number, prefix: number) {
    return new Array(size).fill(255).map((byte, index) => {
      const bytePrefix = 8 - Math.min(Math.max(prefix - index * 8, 0), 8);

      // eslint-disable-next-line no-bitwise
      return (byte >> bytePrefix) << bytePrefix;
    });
  }

  private address: number[];
  private netmask: number[];
  private prefix: number;

  constructor(cidr: string) {
    try {
      const [address, prefix] = ipaddr.parseCIDR(cidr);

      this.address = address.toByteArray();
      this.netmask = CidrMask.getNetmask(this.address.length, prefix);
      this.prefix = prefix;
    } catch {
      throw Error('Invalid CIDR mask: ' + cidr);
    }
  }

  private getBroadcastAddress() {
    // eslint-disable-next-line no-bitwise
    const broadcast = this.address.map((byte, index) => byte | (this.netmask[index] ^ 255));

    return new IpAddress(broadcast).toString();
  }

  private getNetworkAddress() {
    // eslint-disable-next-line no-bitwise
    const network = this.address.map((byte, index) => byte & this.netmask[index]);

    return new IpAddress(network).toString();
  }

  getRange() {
    return {
      from: this.getNetworkAddress(),
      to: this.getBroadcastAddress(),
    };
  }

  toString() {
    return `${new IpAddress(this.address)}/${this.prefix}`;
  }
}
