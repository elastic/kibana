/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { hasIpv6Loopback } from './has_ipv6_loopback';
import { publishLoopbackPort } from './publish_loopback_port';

jest.mock('./has_ipv6_loopback');

const hasIpv6LoopbackMock = hasIpv6Loopback as jest.MockedFunction<typeof hasIpv6Loopback>;

describe('publishLoopbackPort()', () => {
  describe('when the host carries the IPv6 loopback', () => {
    beforeEach(() => hasIpv6LoopbackMock.mockReturnValue(true));

    test('publishes on both loopback addresses, IPv4 first', () => {
      expect(publishLoopbackPort(9200)).toEqual([
        '-p',
        '127.0.0.1:9200:9200',
        '-p',
        '[::1]:9200:9200',
      ]);
    });

    test('brackets the IPv6 address when the container port differs', () => {
      expect(publishLoopbackPort(8082, 1234)).toEqual([
        '-p',
        '127.0.0.1:8082:1234',
        '-p',
        '[::1]:8082:1234',
      ]);
    });

    test('accepts ports as strings', () => {
      expect(publishLoopbackPort('8443', '8443')).toEqual([
        '-p',
        '127.0.0.1:8443:8443',
        '-p',
        '[::1]:8443:8443',
      ]);
    });
  });

  describe('when the host has no IPv6 loopback', () => {
    beforeEach(() => hasIpv6LoopbackMock.mockReturnValue(false));

    test('publishes on IPv4 only, so the container can still start', () => {
      expect(publishLoopbackPort(9200)).toEqual(['-p', '127.0.0.1:9200:9200']);
    });

    test('leaves a differing container port mapping untouched', () => {
      expect(publishLoopbackPort(8082, 1234)).toEqual(['-p', '127.0.0.1:8082:1234']);
    });
  });
});
