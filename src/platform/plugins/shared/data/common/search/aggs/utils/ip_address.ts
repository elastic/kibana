/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import ipaddr, { IPv4, IPv6 } from 'ipaddr.js';

function isIPv6(value: IPv4 | IPv6): value is IPv6 {
  return value.kind() === 'ipv6';
}

export class IpAddress {
  private value: IPv4 | IPv6;

  constructor(ipAddress: string | number | number[]) {
    try {
      this.value = Array.isArray(ipAddress)
        ? ipaddr.fromByteArray(ipAddress)
        : ipaddr.parse(`${ipAddress}`);
    } catch {
      throw Error('Invalid IP address: ' + ipAddress);
    }
  }

  toString() {
    if (isIPv6(this.value)) {
      return this.value.toRFC5952String();
    }

    return this.value.toString();
  }
}
