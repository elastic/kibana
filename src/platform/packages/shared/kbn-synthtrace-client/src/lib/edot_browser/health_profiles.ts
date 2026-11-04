/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type WebVitalName = 'lcp' | 'inp' | 'cls' | 'fcp' | 'ttfb';
export type WebVitalRating = 'good' | 'needs-improvement' | 'poor';
export type HealthProfileName = 'healthy' | 'slow' | 'erroring' | 'critical';

/** Log-normal distribution described by its median and the standard deviation of its log. */
export interface Distribution {
  median: number;
  sigma: number;
}

export interface HealthProfile {
  name: HealthProfileName;
  ttfb: Distribution;
  fcp: Distribution;
  lcp: Distribution;
  inp: Distribution;
  cls: Distribution;
  /** Share of page loads without any layout shift (CLS of effectively 0, see `asFloat`). */
  clsZeroRate: number;
  resourceDuration: Distribution;
  httpLatency: Distribution;
  /** Share of fetch/XHR requests answered with a 4xx/5xx status. */
  httpFailureRate: number;
  /** Share of fetch/XHR requests that never receive a response. */
  networkErrorRate: number;
  /** Probability of an uncaught JS exception per page view. */
  jsErrorRate: number;
}

// https://web.dev/articles/defining-core-web-vitals-thresholds, as used by the web-vitals library
const WEB_VITAL_THRESHOLDS: Readonly<Record<WebVitalName, readonly [number, number]>> = {
  lcp: [2500, 4000],
  inp: [200, 500],
  cls: [0.1, 0.25],
  fcp: [1800, 3000],
  ttfb: [800, 1800],
};

export const getWebVitalRating = (name: WebVitalName, value: number): WebVitalRating => {
  const [good, poor] = WEB_VITAL_THRESHOLDS[name];
  if (value > poor) {
    return 'poor';
  }
  return value > good ? 'needs-improvement' : 'good';
};

const gaussian = (random: () => number) => {
  // Box-Muller transform; `1 - random()` avoids `log(0)`
  return Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random());
};

export const sample = (
  { median, sigma }: Distribution,
  random: () => number = Math.random
): number => median * Math.exp(sigma * gaussian(random));

export const HEALTH_PROFILES: Readonly<Record<HealthProfileName, HealthProfile>> = {
  healthy: {
    name: 'healthy',
    ttfb: { median: 250, sigma: 0.4 },
    fcp: { median: 900, sigma: 0.35 },
    lcp: { median: 1500, sigma: 0.35 },
    inp: { median: 90, sigma: 0.5 },
    cls: { median: 0.02, sigma: 0.8 },
    clsZeroRate: 0.4,
    resourceDuration: { median: 80, sigma: 0.6 },
    httpLatency: { median: 120, sigma: 0.5 },
    httpFailureRate: 0.005,
    networkErrorRate: 0.001,
    jsErrorRate: 0.005,
  },
  slow: {
    name: 'slow',
    ttfb: { median: 900, sigma: 0.4 },
    fcp: { median: 2400, sigma: 0.35 },
    lcp: { median: 4200, sigma: 0.35 },
    inp: { median: 260, sigma: 0.5 },
    cls: { median: 0.08, sigma: 0.7 },
    clsZeroRate: 0.15,
    resourceDuration: { median: 450, sigma: 0.6 },
    httpLatency: { median: 800, sigma: 0.5 },
    httpFailureRate: 0.01,
    networkErrorRate: 0.003,
    jsErrorRate: 0.01,
  },
  erroring: {
    name: 'erroring',
    ttfb: { median: 350, sigma: 0.4 },
    fcp: { median: 1200, sigma: 0.35 },
    lcp: { median: 2100, sigma: 0.35 },
    inp: { median: 150, sigma: 0.5 },
    cls: { median: 0.05, sigma: 0.7 },
    clsZeroRate: 0.25,
    resourceDuration: { median: 120, sigma: 0.6 },
    httpLatency: { median: 250, sigma: 0.6 },
    httpFailureRate: 0.05,
    networkErrorRate: 0.02,
    jsErrorRate: 0.12,
  },
  critical: {
    name: 'critical',
    ttfb: { median: 1400, sigma: 0.4 },
    fcp: { median: 3400, sigma: 0.35 },
    lcp: { median: 5200, sigma: 0.35 },
    inp: { median: 650, sigma: 0.5 },
    cls: { median: 0.32, sigma: 0.5 },
    clsZeroRate: 0.05,
    resourceDuration: { median: 700, sigma: 0.7 },
    httpLatency: { median: 1500, sigma: 0.6 },
    httpFailureRate: 0.25,
    networkErrorRate: 0.05,
    jsErrorRate: 0.3,
  },
};
