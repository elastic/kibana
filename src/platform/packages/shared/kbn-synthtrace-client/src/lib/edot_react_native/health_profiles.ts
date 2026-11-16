/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Distribution, HealthProfileName } from '../edot_shared/health_profiles';

export interface MobileHealthProfile {
  name: HealthProfileName;
  /** Time from process start until the first screen is shown, in milliseconds. */
  coldLaunch: Distribution;
  /** Time a screen takes from `viewWillAppear` to `viewDidAppear`, in milliseconds. */
  viewAppear: Distribution;
  httpLatency: Distribution;
  /** Share of HTTP requests answered with a 4xx/5xx status. */
  httpFailureRate: number;
  /** Share of HTTP requests that never receive a response. */
  networkErrorRate: number;
  /** Probability that the app logs an error on a screen view, on top of failed requests. */
  errorLogRate: number;
  /** Probability that the app crashes during a visit. */
  crashRate: number;
  /** Share of sessions on a cellular connection rather than wifi. */
  cellularRate: number;
}

export const MOBILE_HEALTH_PROFILES: Readonly<Record<HealthProfileName, MobileHealthProfile>> = {
  healthy: {
    name: 'healthy',
    coldLaunch: { median: 900, sigma: 0.3 },
    viewAppear: { median: 60, sigma: 0.4 },
    httpLatency: { median: 180, sigma: 0.5 },
    httpFailureRate: 0.005,
    networkErrorRate: 0.005,
    errorLogRate: 0.01,
    crashRate: 0.002,
    cellularRate: 0.3,
  },
  slow: {
    name: 'slow',
    coldLaunch: { median: 2800, sigma: 0.35 },
    viewAppear: { median: 350, sigma: 0.5 },
    httpLatency: { median: 1400, sigma: 0.6 },
    httpFailureRate: 0.01,
    networkErrorRate: 0.03,
    errorLogRate: 0.02,
    crashRate: 0.005,
    cellularRate: 0.6,
  },
  erroring: {
    name: 'erroring',
    coldLaunch: { median: 1200, sigma: 0.3 },
    viewAppear: { median: 90, sigma: 0.4 },
    httpLatency: { median: 300, sigma: 0.6 },
    httpFailureRate: 0.06,
    networkErrorRate: 0.02,
    errorLogRate: 0.12,
    crashRate: 0.04,
    cellularRate: 0.35,
  },
  critical: {
    name: 'critical',
    coldLaunch: { median: 3500, sigma: 0.4 },
    viewAppear: { median: 500, sigma: 0.6 },
    httpLatency: { median: 2000, sigma: 0.7 },
    httpFailureRate: 0.2,
    networkErrorRate: 0.08,
    errorLogRate: 0.3,
    crashRate: 0.15,
    cellularRate: 0.7,
  },
};
