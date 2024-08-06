/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getIpRangeQuery, getIpSegments, getMinMaxIp } from './ip_search';

describe('test IP search functionality', () => {
  test('get IP segments', () => {
    expect(getIpSegments('')).toStrictEqual({ segments: [''], type: 'unknown' });
    expect(getIpSegments('test')).toStrictEqual({ segments: ['test'], type: 'unknown' });
    expect(getIpSegments('123.456')).toStrictEqual({ segments: ['123', '456'], type: 'ipv4' });
    expect(getIpSegments('123..456...')).toStrictEqual({ segments: ['123', '456'], type: 'ipv4' });
    expect(getIpSegments('abc:def:')).toStrictEqual({ segments: ['abc', 'def'], type: 'ipv6' });
    expect(getIpSegments(':::x:::abc:::def:::')).toStrictEqual({
      segments: ['x', 'abc', 'def'],
      type: 'ipv6',
    });
  });

  test('get min/max IP', () => {
    expect(getMinMaxIp('ipv4', ['123'])).toStrictEqual({
      min: '123.0.0.0',
      max: '123.255.255.255',
    });
    expect(getMinMaxIp('ipv4', ['123', '456', '789'])).toStrictEqual({
      min: '123.456.789.0',
      max: '123.456.789.255',
    });
    expect(getMinMaxIp('ipv6', ['abc', 'def'])).toStrictEqual({
      min: 'abc:def::',
      max: 'abc:def:ffff:ffff:ffff:ffff:ffff:ffff',
    });
    expect(getMinMaxIp('ipv6', ['a', 'b', 'c', 'd', 'e', 'f', 'g'])).toStrictEqual({
      min: 'a:b:c:d:e:f:g::',
      max: 'a:b:c:d:e:f:g:ffff',
    });
  });

  test('get IP range query', () => {
    // invalid searches
    expect(getIpRangeQuery('xyz')).toStrictEqual({
      validSearch: false,
    });
    expect(getIpRangeQuery('123.456.OVER 9000')).toStrictEqual({
      validSearch: false,
    });
    expect(getIpRangeQuery('abc:def:ghi')).toStrictEqual({
      validSearch: false,
    });

    // full IP searches
    expect(getIpRangeQuery('1.2.3.4')).toStrictEqual({
      validSearch: true,
      rangeQuery: [
        {
          key: 'ipv4',
          mask: '1.2.3.4/32',
        },
      ],
    });
    expect(getIpRangeQuery('1.2.3.256')).toStrictEqual({
      validSearch: false,
      rangeQuery: undefined,
    });
    expect(getIpRangeQuery('fbbe:a363:9e14:987c:49cf:d4d0:d8c8:bc42')).toStrictEqual({
      validSearch: true,
      rangeQuery: [
        {
          key: 'ipv6',
          mask: 'fbbe:a363:9e14:987c:49cf:d4d0:d8c8:bc42/128',
        },
      ],
    });

    // partial IP searches - ipv4
    const partialIpv4 = getIpRangeQuery('12.34.');
    expect(partialIpv4.validSearch).toBe(true);
    expect(partialIpv4.rangeQuery?.[0]).toStrictEqual({
      key: 'ipv4',
      from: '12.34.0.0',
      to: '12.34.255.255',
    });
    expect(getIpRangeQuery('123.456.7')).toStrictEqual({
      validSearch: false,
      rangeQuery: [],
    });
    expect(getIpRangeQuery('12:34.56')).toStrictEqual({
      validSearch: false,
      rangeQuery: [],
    });

    // partial IP searches - ipv6
    const partialIpv6 = getIpRangeQuery('fbbe:a363:9e14:987c:49cf');
    expect(partialIpv6.validSearch).toBe(true);
    expect(partialIpv6.rangeQuery?.[0]).toStrictEqual({
      key: 'ipv6',
      from: 'fbbe:a363:9e14:987c:49cf::',
      to: 'fbbe:a363:9e14:987c:49cf:ffff:ffff:ffff',
    });

    // partial IP searches - unknown type
    let partialUnknownIp = getIpRangeQuery('1234');
    expect(partialUnknownIp.validSearch).toBe(true);
    expect(partialUnknownIp.rangeQuery?.length).toBe(1);
    expect(partialUnknownIp.rangeQuery?.[0]).toStrictEqual({
      key: 'ipv6',
      from: '1234::',
      to: '1234:ffff:ffff:ffff:ffff:ffff:ffff:ffff',
    });

    partialUnknownIp = getIpRangeQuery('123');
    expect(partialUnknownIp.validSearch).toBe(true);
    expect(partialUnknownIp.rangeQuery?.length).toBe(2);
    expect(partialUnknownIp.rangeQuery?.[0]).toStrictEqual({
      key: 'ipv4',
      from: '123.0.0.0',
      to: '123.255.255.255',
    });
    expect(partialUnknownIp.rangeQuery?.[1]).toStrictEqual({
      key: 'ipv6',
      from: '123::',
      to: '123:ffff:ffff:ffff:ffff:ffff:ffff:ffff',
    });
  });
});
