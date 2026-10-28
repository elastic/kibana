/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ResourceTimingValues } from './edot_browser_client';
import { between } from './random';

const MIN_EXCHANGE_MS = 10;

/**
 * Resource timings of a fetch, with phases in the order the browser goes through them. Phases that
 * don't happen (DNS and connect on a reused connection) are 0.
 */
export const resourceTimings = (
  random: () => number,
  fetchStart: number,
  duration: number,
  sizeBytes: number,
  { cached = false, newConnection = false } = {}
): ResourceTimingValues => {
  const dns = newConnection ? between(random, 5, 40) : 0;
  const connect = newConnection ? between(random, 20, 80) : 0;
  // Connection setup is part of the fetch, so it can't take longer than the whole request
  const total = newConnection ? Math.max(duration, dns + connect + MIN_EXCHANGE_MS) : duration;
  const exchange = total - dns - connect;
  const domainLookupEnd = fetchStart + dns;
  const connectEnd = domainLookupEnd + connect;
  const requestStart = connectEnd + exchange * 0.05;
  const responseStart = requestStart + exchange * 0.6;
  const encodedBodySize = Math.round(sizeBytes * between(random, 0.9, 1.1));
  return {
    duration: total,
    fetchStart,
    domainLookupStart: fetchStart,
    domainLookupEnd,
    connectStart: domainLookupEnd,
    connectEnd,
    secureConnectionStart: newConnection ? domainLookupEnd + connect * 0.4 : 0,
    requestStart,
    responseStart,
    responseEnd: fetchStart + total,
    transferSize: cached ? 0 : encodedBodySize + 300,
    encodedBodySize,
    decodedBodySize: Math.round(encodedBodySize * between(random, 2, 4)),
  };
};
