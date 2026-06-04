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

const absolutePart = (
  text: string,
  start: number,
  kind: RangePart['kind'],
  format: string
): RangePart => ({
  text,
  start,
  end: start + text.length,
  kind,
  navigable: true,
  rangeIndex: 0,
  format,
});

const defaultAbsoluteParts = (text = 'May 31, 2026, 23:59') => {
  const format = 'MMM D, YYYY, HH:mm';
  return [
    absolutePart('May', text.indexOf('May'), 'month', format),
    absolutePart('31', text.indexOf('31'), 'day', format),
    absolutePart('2026', text.indexOf('2026'), 'year', format),
    absolutePart('23', text.indexOf('23'), 'hour', format),
    absolutePart('59', text.indexOf('59'), 'minute', format),
  ];
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

  describe('absolute dates', () => {
    it('cascades sub-day overflow using moment semantics', () => {
      const text = 'May 31, 2026, 23:59';
      const parts = defaultAbsoluteParts(text);
      const minute = parts.find((part) => part.kind === 'minute');
      if (!minute) throw new Error('Minute part not found');

      expect(applyPartModification(text, minute, 'increase', parts)).toBe('Jun 1, 2026, 00:00');
    });

    it('clamps month overflow', () => {
      const text = 'Jan 31, 2026, 00:00:00.000';
      const format = 'MMM D, YYYY, HH:mm:ss.SSS';
      const parts = [
        absolutePart('Jan', 0, 'month', format),
        absolutePart('31', 4, 'day', format),
        absolutePart('2026', 8, 'year', format),
        absolutePart('00', 14, 'hour', format),
        absolutePart('00', 17, 'minute', format),
        absolutePart('00', 20, 'second', format),
        absolutePart('000', 23, 'millisecond', format),
      ];

      expect(applyPartModification(text, parts[0], 'increase', parts)).toBe(
        'Feb 28, 2026, 00:00:00.000'
      );
    });

    it('clamps year overflow for leap days', () => {
      const text = 'Feb 29, 2024, 00:00';
      const format = 'MMM D, YYYY, HH:mm';
      const parts = [
        absolutePart('Feb', 0, 'month', format),
        absolutePart('29', 4, 'day', format),
        absolutePart('2024', 8, 'year', format),
        absolutePart('00', 14, 'hour', format),
        absolutePart('00', 17, 'minute', format),
      ];
      const year = parts[2];

      expect(applyPartModification(text, year, 'increase', parts)).toBe('Feb 28, 2025, 00:00');
    });

    it('preserves the matched format when serializing', () => {
      const text = 'May 5, 2026, 00:00';
      const format = 'MMM D, YYYY, HH:mm';
      const parts = [
        absolutePart('May', 0, 'month', format),
        absolutePart('5', 4, 'day', format),
        absolutePart('2026', 7, 'year', format),
        absolutePart('00', 13, 'hour', format),
        absolutePart('00', 16, 'minute', format),
      ];

      expect(applyPartModification(text, parts[1], 'increase', parts)).toBe('May 6, 2026, 00:00');
    });

    it('returns undefined when the selected part has no format', () => {
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
