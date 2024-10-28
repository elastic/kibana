/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type NetworkProfile = 'NO_THROTTLING' | 'FAST_3G' | 'SLOW_3G' | 'OFFLINE' | 'CLOUD_USER';

export interface NetworkOptions {
  offline: boolean;
  latency: number;
  download_throughput: number;
  upload_throughput: number;
}

const sec = 10 ** 3;
const MBps = 10 ** 6 / 8; // megabyte per second (MB/s) (can be abbreviated as MBps)

// Selenium uses B/s (bytes) for network throttling
// Download (B/s)	Upload (B/s) Latency (ms)

export const NETWORK_PROFILES: Record<NetworkProfile, NetworkOptions> = {
  NO_THROTTLING: {
    offline: false,
    latency: 0,
    download_throughput: -1,
    upload_throughput: -1,
  },
  FAST_3G: {
    offline: false,
    latency: 0.56 * sec,
    download_throughput: 1.44 * MBps,
    upload_throughput: 0.7 * MBps,
  },
  SLOW_3G: {
    offline: false,
    latency: 2 * sec,
    download_throughput: 0.4 * MBps,
    upload_throughput: 0.4 * MBps,
  },
  OFFLINE: {
    offline: true,
    latency: 0,
    download_throughput: 0,
    upload_throughput: 0,
  },
  CLOUD_USER: {
    offline: false,
    latency: 0.1 * sec,
    download_throughput: 6 * MBps,
    upload_throughput: 6 * MBps,
  },
};
