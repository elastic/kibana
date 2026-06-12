/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Totally cribbed this from Kibana 3.
// I bet there's something similar in the Kibana 4 code. Somewhere. Somehow.
import { toMS } from './to_milliseconds';

function roundInterval(interval: number) {
  switch (true) {
    case interval <= 500: // <= 0.5s
      return '100ms';
    case interval <= 5000: // <= 5s
      return '1s';
    case interval <= 7500: // <= 7.5s
      return '5s';
    case interval <= 15000: // <= 15s
      return '10s';
    case interval <= 45000: // <= 45s
      return '30s';
    case interval <= 180000: // <= 3m
      return '1m';
    case interval <= 450000: // <= 9m
      return '5m';
    case interval <= 1200000: // <= 20m
      return '10m';
    case interval <= 2700000: // <= 45m
      return '30m';
    case interval <= 7200000: // <= 2h
      return '1h';
    case interval <= 21600000: // <= 6h
      return '3h';
    case interval <= 86400000: // <= 24h
      return '12h';
    case interval <= 604800000: // <= 1w
      return '24h';
    case interval <= 1814400000: // <= 3w
      return '1w';
    case interval < 3628800000: // <  2y
      return '30d';
    default:
      return '1y';
  }
}

export function calculateInterval(
  from: number,
  to: number,
  size: number,
  interval: string,
  min: string
) {
  if (interval !== 'auto') {
    return interval;
  }

  const dateMathInterval: string = roundInterval((to - from) / size);
  const dateMathIntervalMs = toMS(dateMathInterval);
  const minMs = toMS(min);

  if (dateMathIntervalMs !== undefined && minMs !== undefined && dateMathIntervalMs < minMs) {
    return min;
  }

  return dateMathInterval;
}
