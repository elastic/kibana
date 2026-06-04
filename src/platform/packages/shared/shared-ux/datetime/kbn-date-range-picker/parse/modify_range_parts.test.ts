/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PartKind, RangePart } from './parse_range_parts';
import { parseInputParts } from './parse_range_parts';
import { applyPartModification } from './modify_range_parts';

const getPart = (text: string, kind: PartKind, partText?: string) => {
  const parts = parseInputParts(text);
  const part = parts.find(
    (candidate) => candidate.kind === kind && (!partText || candidate.text === partText)
  );
  if (!part) throw new Error(`Part not found: ${kind} ${partText ?? ''}`);
  return { part, parts };
};

const modify = (
  text: string,
  kind: PartKind,
  action: 'increase' | 'decrease',
  partText?: string
) => {
  const { part, parts } = getPart(text, kind, partText);
  return applyPartModification(text, part, action, parts);
};

describe('applyPartModification', () => {
  describe('relative-value', () => {
    it('increments and decrements values', () => {
      expect(modify('last 5 minutes', 'relative-value', 'increase')).toBe('last 6 minutes');
      expect(modify('last 5 minutes', 'relative-value', 'decrease')).toBe('last 4 minutes');
    });

    it('does not decrement below one', () => {
      expect(modify('last 1 day', 'relative-value', 'decrease')).toBeUndefined();
    });

    it('only splices the selected value', () => {
      expect(modify('last 1 days', 'relative-value', 'increase')).toBe('last 2 days');
      expect(modify('last 2 days', 'relative-value', 'decrease')).toBe('last 1 days');
    });
  });

  describe('relative-direction', () => {
    it('toggles shorthand directions', () => {
      expect(modify('-7d', 'relative-direction', 'increase')).toBe('+7d');
      expect(modify('+7d', 'relative-direction', 'decrease')).toBe('-7d');
    });

    it('toggles long-form directions', () => {
      expect(modify('last 7 days', 'relative-direction', 'increase')).toBe('next 7 days');
      expect(modify('past 7 days', 'relative-direction', 'increase')).toBe('next 7 days');
      expect(modify('next 7 days', 'relative-direction', 'decrease')).toBe('last 7 days');
    });

    it('preserves title casing for long-form directions', () => {
      expect(modify('Last 7 days', 'relative-direction', 'increase')).toBe('Next 7 days');
      expect(modify('Next 7 days', 'relative-direction', 'decrease')).toBe('Last 7 days');
    });
  });

  describe('relative-unit', () => {
    it('cycles shorthand units', () => {
      expect(modify('-7d', 'relative-unit', 'increase')).toBe('-7w');
      expect(modify('-7d', 'relative-unit', 'decrease')).toBe('-7h');
    });

    it('cycles long-form units with canonical plural agreement', () => {
      expect(modify('last 5 minutes', 'relative-unit', 'increase')).toBe('last 5 hours');
      expect(modify('last 1 minute', 'relative-unit', 'increase')).toBe('last 1 hour');
      expect(modify('last 1 min', 'relative-unit', 'increase')).toBe('last 1 hour');
    });

    it('stops at cycle boundaries', () => {
      expect(modify('last 5 years', 'relative-unit', 'increase')).toBeUndefined();
      expect(modify('-5ms', 'relative-unit', 'decrease')).toBeUndefined();
    });
  });

  describe('rounding-unit', () => {
    it('cycles rounding units', () => {
      expect(modify('-7d/s', 'rounding-unit', 'increase')).toBe('-7d/m');
      expect(modify('-7d/h', 'rounding-unit', 'decrease')).toBe('-7d/m');
    });

    it('stops at cycle boundaries', () => {
      expect(modify('-7d/d', 'rounding-unit', 'increase')).toBeUndefined();
      expect(modify('-7d/s', 'rounding-unit', 'decrease')).toBeUndefined();
    });
  });

  describe('unsupported parts', () => {
    it('returns undefined for absolute-date parts until absolute modification is enabled', () => {
      const part: RangePart = {
        text: '5',
        start: 4,
        end: 5,
        kind: 'day',
        navigable: true,
        rangeIndex: 0,
      };

      expect(applyPartModification('May 5, 2026, 00:00', part, 'increase', [part])).toBeUndefined();
    });
  });
});
