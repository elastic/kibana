/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { asFloat } from './as_float';
import { BROWSER_PROFILES, pickBrowserProfile } from './browser_profiles';
import { HEALTH_PROFILES, getWebVitalRating } from './health_profiles';

const hasFractionalPart = (value: number) => JSON.stringify(value).includes('.');

describe('edotBrowser', () => {
  describe('asFloat', () => {
    it('rounds to 0.1 precision by default', () => {
      expect(asFloat(123.456)).toBe(123.5);
    });

    it('keeps a fractional part after JSON serialization for integral values', () => {
      [0, 1, 2.0, 1234, 1234.04, 99.96].forEach((value) => {
        const result = asFloat(value);
        expect(hasFractionalPart(result)).toBe(true);
        expect(Math.abs(result - value)).toBeLessThan(0.1);
      });
    });

    it('supports a custom precision', () => {
      expect(asFloat(0.123456, 4)).toBe(0.1235);
      expect(hasFractionalPart(asFloat(0, 4))).toBe(true);
      expect(asFloat(0, 4)).toBeLessThan(0.0001);
    });
  });

  describe('browser profiles', () => {
    it('has matching browser attributes and user agents', () => {
      const uaTokens: Record<string, string> = {
        Chrome: 'Chrome/',
        Edge: 'Edg/',
        Firefox: 'Firefox/',
        Safari: 'Version/',
      };
      Object.values(BROWSER_PROFILES).forEach(({ resourceAttributes }) => {
        const userAgent = resourceAttributes['user_agent.original'];
        expect(userAgent).toContain(
          `${uaTokens[resourceAttributes['browser.name']]}${resourceAttributes['browser.version']}`
        );
        expect(typeof resourceAttributes['browser.mobile']).toBe('boolean');
        expect(resourceAttributes['browser.language']).toBeTruthy();
      });
    });

    it('only sets browser.brands for Chromium-based browsers', () => {
      expect(BROWSER_PROFILES.chromeMacos.resourceAttributes['browser.brands']).toBeDefined();
      expect(BROWSER_PROFILES.firefoxLinux.resourceAttributes).not.toHaveProperty(
        'browser.brands'
      );
      expect(BROWSER_PROFILES.safariIos.resourceAttributes).not.toHaveProperty('browser.brands');
    });

    it('picks a profile from the weighted set', () => {
      const profiles = Object.values(BROWSER_PROFILES);
      expect(profiles).toContain(pickBrowserProfile());
      expect(pickBrowserProfile(() => 0)).toBe(profiles[0]);
      expect(pickBrowserProfile(() => 0.999999)).toBe(profiles[profiles.length - 1]);
    });
  });

  describe('health profiles', () => {
    it('rates web vitals using the web-vitals thresholds', () => {
      expect(getWebVitalRating('lcp', 2500)).toBe('good');
      expect(getWebVitalRating('lcp', 2501)).toBe('needs-improvement');
      expect(getWebVitalRating('lcp', 4001)).toBe('poor');
      expect(getWebVitalRating('inp', 199)).toBe('good');
      expect(getWebVitalRating('inp', 501)).toBe('poor');
      expect(getWebVitalRating('cls', 0.1)).toBe('good');
      expect(getWebVitalRating('cls', 0.2)).toBe('needs-improvement');
      expect(getWebVitalRating('fcp', 3001)).toBe('poor');
      expect(getWebVitalRating('ttfb', 900)).toBe('needs-improvement');
    });

    it('orders profiles by degrading health', () => {
      const { healthy, slow, erroring, critical } = HEALTH_PROFILES;
      expect(slow.lcp.median).toBeGreaterThan(healthy.lcp.median);
      expect(erroring.httpFailureRate).toBeGreaterThan(healthy.httpFailureRate);
      expect(critical.jsErrorRate).toBeGreaterThan(healthy.jsErrorRate);
      expect(critical.inp.median).toBeGreaterThan(healthy.inp.median);
      expect(critical.cls.median).toBeGreaterThan(healthy.cls.median);
    });
  });
});
