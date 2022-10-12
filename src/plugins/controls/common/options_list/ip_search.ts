/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import ipaddr from 'ipaddr.js';

export type IpRangeQuery = Array<
  { key: string; from: string; to: string } | { key: string; mask: string }
>;
interface IpSegments {
  segments: string[];
  type: 'ipv4' | 'ipv6' | 'unknown';
}

const getIpSegments = (searchString: string): IpSegments => {
  if (searchString.indexOf('.') !== -1) {
    const ipv4Segments = searchString.split('.').filter((segment) => segment !== '');
    return { segments: ipv4Segments, type: 'ipv4' };
  } else if (searchString.indexOf(':') !== -1) {
    const ipv6Segments = searchString.split(':').filter((segment) => segment !== '');
    return { segments: ipv6Segments, type: 'ipv6' };
  }
  return { segments: [searchString], type: 'unknown' };
};

const fullIpSearch = (type: 'ipv4' | 'ipv6', segments: string[]): IpRangeQuery => {
  const isIpv4 = type === 'ipv4';
  const searchIp = segments.join(isIpv4 ? '.' : ':');
  if (ipaddr.isValid(searchIp)) {
    return [
      {
        key: type,
        mask: isIpv4 ? searchIp + '/32' : searchIp + '/64',
      },
    ];
  }
  return [];
};

const partialIpSearch = (type: 'ipv4' | 'ipv6', segments: string[]): IpRangeQuery => {
  const isIpv4 = type === 'ipv4';
  const minIp = isIpv4
    ? segments.concat(Array(4 - segments.length).fill('0')).join('.')
    : segments[0] + '::';
  const maxIp = isIpv4
    ? segments.concat(Array(4 - segments.length).fill('255')).join('.')
    : segments.concat(Array(8 - segments.length).fill('ffff')).join(':');
  if (ipaddr.isValid(minIp) && ipaddr.isValid(maxIp)) {
    return [
      {
        key: type,
        from: minIp,
        to: maxIp,
      },
    ];
  }

  return [];
};

export const getIpRangeQuery = (searchString: string): IpRangeQuery => {
  if (searchString.match(/^[A-Fa-f0-9.:]*$/) === null) {
    return [];
  }

  const { type: ipType, segments: ipSegments } = getIpSegments(searchString);
  if (ipType === 'ipv6' && ipSegments.length === 8) {
    return fullIpSearch('ipv6', ipSegments);
  }
  if (ipType === 'ipv4' && ipSegments.length === 4) {
    return fullIpSearch('ipv4', ipSegments);
  }

  return partialIpSearch('ipv4', ipSegments).concat(partialIpSearch('ipv6', ipSegments));
};
