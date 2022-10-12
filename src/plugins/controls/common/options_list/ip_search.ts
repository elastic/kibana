/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import ipaddr from 'ipaddr.js';

export interface IpRangeQuery {
  validSearch: boolean;
  rangeQuery?: Array<{ key: string; from: string; to: string } | { key: string; mask: string }>;
}
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

const buildFullIpSearchRangeQuery = (segments: IpSegments): IpRangeQuery['rangeQuery'] => {
  const { type: ipType, segments: ipSegments } = segments;

  const isIpv4 = ipType === 'ipv4';
  const searchIp = ipSegments.join(isIpv4 ? '.' : ':');
  if (ipaddr.isValid(searchIp)) {
    return [
      {
        key: ipType,
        mask: isIpv4 ? searchIp + '/32' : searchIp + '/128',
      },
    ];
  }
};

const getMinMaxIp = (
  type: 'ipv4' | 'ipv6',
  segments: IpSegments['segments']
): { min: string; max: string } => {
  const isIpv4 = type === 'ipv4';
  const minIp = isIpv4
    ? segments.concat(Array(4 - segments.length).fill('0')).join('.')
    : segments[0] + '::';
  const maxIp = isIpv4
    ? segments.concat(Array(4 - segments.length).fill('255')).join('.')
    : segments.concat(Array(8 - segments.length).fill('ffff')).join(':');
  return {
    min: minIp,
    max: maxIp,
  };
};

const buildPartialIpSearchRangeQuery = (segments: IpSegments): IpRangeQuery['rangeQuery'] => {
  const { type: ipType, segments: ipSegments } = segments;

  const ranges = [];
  if (ipType === 'unknown' || ipType === 'ipv4') {
    const { min: minIpv4, max: maxIpv4 } = getMinMaxIp('ipv4', ipSegments);

    if (ipaddr.isValid(minIpv4) && ipaddr.isValid(maxIpv4)) {
      ranges.push({
        key: 'ipv4',
        from: minIpv4,
        to: maxIpv4,
      });
    }
  }

  if (ipType === 'unknown' || ipType === 'ipv6') {
    const { min: minIpv6, max: maxIpv6 } = getMinMaxIp('ipv6', ipSegments);

    if (ipaddr.isValid(minIpv6) && ipaddr.isValid(maxIpv6)) {
      ranges.push({
        key: 'ipv6',
        from: minIpv6,
        to: maxIpv6,
      });
    }
  }

  return ranges;
};

export const getIpRangeQuery = (searchString: string): IpRangeQuery => {
  if (searchString.match(/^[A-Fa-f0-9.:]*$/) === null) {
    return { validSearch: false };
  }

  const ipSegments = getIpSegments(searchString);

  if (ipSegments.type === 'ipv4' && ipSegments.segments.length === 4) {
    const ipv4RangeQuery = buildFullIpSearchRangeQuery(ipSegments);
    if (!Boolean(ipv4RangeQuery)) {
      return { validSearch: false };
    }
    return { validSearch: true, rangeQuery: ipv4RangeQuery };
  }
  if (ipSegments.type === 'ipv6' && ipSegments.segments.length === 8) {
    const ipv6RangeQuery = buildFullIpSearchRangeQuery(ipSegments);
    if (!Boolean(ipv6RangeQuery)) {
      return { validSearch: false };
    }
    return { validSearch: true, rangeQuery: ipv6RangeQuery };
  }

  const partialRangeQuery = buildPartialIpSearchRangeQuery(ipSegments);
  if (partialRangeQuery === []) {
    return { validSearch: false };
  }
  return {
    validSearch: true,
    rangeQuery: partialRangeQuery,
  };
};
