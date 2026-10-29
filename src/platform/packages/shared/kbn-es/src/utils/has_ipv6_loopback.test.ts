/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { NetworkInterfaceInfo } from 'os';
import { networkInterfaces } from 'os';

import { hasIpv6Loopback } from './has_ipv6_loopback';

jest.mock('os', () => ({ networkInterfaces: jest.fn() }));

const networkInterfacesMock = networkInterfaces as jest.MockedFunction<typeof networkInterfaces>;

const ipv4Loopback = {
  address: '127.0.0.1',
  family: 'IPv4',
  internal: true,
} as NetworkInterfaceInfo;

const ipv6Loopback = {
  address: '::1',
  family: 'IPv6',
  internal: true,
} as NetworkInterfaceInfo;

const ipv6External = {
  address: '2600:1f18::1',
  family: 'IPv6',
  internal: false,
} as NetworkInterfaceInfo;

describe('hasIpv6Loopback()', () => {
  test('is true on a dual-stack loopback', () => {
    networkInterfacesMock.mockReturnValue({ lo: [ipv4Loopback, ipv6Loopback] });

    expect(hasIpv6Loopback()).toBe(true);
  });

  test('is false when IPv6 is disabled and the loopback only carries 127.0.0.1', () => {
    networkInterfacesMock.mockReturnValue({ lo: [ipv4Loopback] });

    expect(hasIpv6Loopback()).toBe(false);
  });

  test('ignores routable IPv6 addresses, which Docker cannot treat as a loopback', () => {
    networkInterfacesMock.mockReturnValue({ lo: [ipv4Loopback], eth0: [ipv6External] });

    expect(hasIpv6Loopback()).toBe(false);
  });

  test('tolerates interfaces reported without details', () => {
    networkInterfacesMock.mockReturnValue({ lo: undefined });

    expect(hasIpv6Loopback()).toBe(false);
  });
});
