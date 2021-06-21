/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import ipaddr from 'ipaddr.js';
import { IpAddress } from '../../utils';

export class CidrMask {
  private address: number[];
  private netmask: number;

  constructor(cidr: string) {
    try {
      const [address, netmask] = ipaddr.parseCIDR(cidr);

      this.address = address.toByteArray();
      this.netmask = netmask;
    } catch {
      throw Error('Invalid CIDR mask: ' + cidr);
    }
  }

  private getBroadcastAddress() {
    /* eslint-disable no-bitwise */
    const netmask = (1n << BigInt(this.address.length * 8 - this.netmask)) - 1n;
    const broadcast = this.address.map((byte, index) => {
      const offset = BigInt(this.address.length - index - 1) * 8n;
      const mask = Number((netmask >> offset) & 255n);

      return byte | mask;
    });
    /* eslint-enable no-bitwise */

    return new IpAddress(broadcast).toString();
  }

  private getNetworkAddress() {
    /* eslint-disable no-bitwise */
    const netmask = (1n << BigInt(this.address.length * 8 - this.netmask)) - 1n;
    const network = this.address.map((byte, index) => {
      const offset = BigInt(this.address.length - index - 1) * 8n;
      const mask = Number((netmask >> offset) & 255n) ^ 255;

      return byte & mask;
    });
    /* eslint-enable no-bitwise */

    return new IpAddress(network).toString();
  }

  getRange() {
    return {
      from: this.getNetworkAddress(),
      to: this.getBroadcastAddress(),
    };
  }

  toString() {
    return `${new IpAddress(this.address)}/${this.netmask}`;
  }
}
