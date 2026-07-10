/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { durationInputUnitCompat, durationOutputUnitCompat } from './duration_units';

describe('Duration unit transforms', () => {
  describe('durationInputUnitCompat', () => {
    it('converts fine-grained DSL input units to Lens state', () => {
      expect(durationInputUnitCompat.toState('ps')).toBe('picoseconds');
      expect(durationInputUnitCompat.toState('ns')).toBe('nanoseconds');
      expect(durationInputUnitCompat.toState('us')).toBe('microseconds');
    });

    it('converts GA input units to Lens state', () => {
      expect(durationInputUnitCompat.toState('ms')).toBe('milliseconds');
      expect(durationInputUnitCompat.toState('s')).toBe('seconds');
      expect(durationInputUnitCompat.toState('min')).toBe('minutes');
      expect(durationInputUnitCompat.toState('mo')).toBe('months');
      expect(durationInputUnitCompat.toState('y')).toBe('years');
    });

    it('converts legacy `m` input unit to Lens state', () => {
      expect(durationInputUnitCompat.toState('m')).toBe('minutes');
    });

    it('converts Lens state input units to API enums (always GA)', () => {
      expect(durationInputUnitCompat.toAPI('milliseconds')).toBe('ms');
      expect(durationInputUnitCompat.toAPI('seconds')).toBe('s');
      expect(durationInputUnitCompat.toAPI('minutes')).toBe('min');
      expect(durationInputUnitCompat.toAPI('microseconds')).toBe('us');
    });

    it('returns API default when unit is missing', () => {
      expect(durationInputUnitCompat.toAPI()).toBe('s');
    });
  });

  describe('durationOutputUnitCompat', () => {
    it('converts GA auto strategies to Lens state', () => {
      expect(durationOutputUnitCompat.toState('auto-approximate')).toBe('humanize');
      expect(durationOutputUnitCompat.toState('auto')).toBe('humanizePrecise');
    });

    it('converts GA fixed output units to Lens state', () => {
      expect(durationOutputUnitCompat.toState('ms')).toBe('asMilliseconds');
      expect(durationOutputUnitCompat.toState('s')).toBe('asSeconds');
      expect(durationOutputUnitCompat.toState('min')).toBe('asMinutes');
      expect(durationOutputUnitCompat.toState('mo')).toBe('asMonths');
      expect(durationOutputUnitCompat.toState('y')).toBe('asYears');
    });

    it('converts legacy output names to Lens state', () => {
      expect(durationOutputUnitCompat.toState('humanize')).toBe('humanize');
      expect(durationOutputUnitCompat.toState('humanizePrecise')).toBe('humanizePrecise');
      expect(durationOutputUnitCompat.toState('m')).toBe('asMinutes');
    });

    it('converts Lens state output methods to API enums (always GA)', () => {
      expect(durationOutputUnitCompat.toAPI('asSeconds')).toBe('s');
      expect(durationOutputUnitCompat.toAPI('humanize')).toBe('auto-approximate');
      expect(durationOutputUnitCompat.toAPI('humanizePrecise')).toBe('auto');
      expect(durationOutputUnitCompat.toAPI('asMinutes')).toBe('min');
      expect(durationOutputUnitCompat.toAPI('asMonths')).toBe('mo');
    });

    it('returns API default when unit is missing', () => {
      expect(durationOutputUnitCompat.toAPI()).toBe('auto-approximate');
    });
  });
});
