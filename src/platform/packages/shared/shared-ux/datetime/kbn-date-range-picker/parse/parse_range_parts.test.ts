/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DATE_TYPE_NOW, DATE_TYPE_RELATIVE } from '../constants';
import { parseDisplayParts, parseInputParts } from './parse_range_parts';

describe('parse range parts', () => {
  describe('parseInputParts', () => {
    it('splits collapsed shorthand relative input into navigable parts', () => {
      expect(parseInputParts('-24h', [DATE_TYPE_RELATIVE, DATE_TYPE_NOW])).toEqual([
        {
          text: '-',
          start: 0,
          end: 1,
          kind: 'relative-direction',
          navigable: true,
          rangeIndex: 0,
        },
        {
          text: '24',
          start: 1,
          end: 3,
          kind: 'relative-value',
          navigable: true,
          rangeIndex: 0,
        },
        {
          text: 'h',
          start: 3,
          end: 4,
          kind: 'relative-unit',
          navigable: true,
          rangeIndex: 0,
        },
      ]);
    });

    it('uses range type to place collapsed future input on the end side', () => {
      expect(parseInputParts('+3d', [DATE_TYPE_NOW, DATE_TYPE_RELATIVE])).toEqual([
        expect.objectContaining({ text: '+', kind: 'relative-direction', rangeIndex: 1 }),
        expect.objectContaining({ text: '3', kind: 'relative-value', rangeIndex: 1 }),
        expect.objectContaining({ text: 'd', kind: 'relative-unit', rangeIndex: 1 }),
      ]);
    });

    it('emits delimiter and absolute date parts for full input ranges', () => {
      expect(parseInputParts('May 5, 2026, 00:00:00.000 to May 6, 2026, 23:59:59.999')).toEqual([
        expect.objectContaining({ text: 'May', kind: 'month', rangeIndex: 0 }),
        expect.objectContaining({ text: '5', kind: 'day', rangeIndex: 0 }),
        expect.objectContaining({ text: '2026', kind: 'year', rangeIndex: 0 }),
        expect.objectContaining({ text: '00', kind: 'hour', rangeIndex: 0 }),
        expect.objectContaining({ text: '00', kind: 'minute', rangeIndex: 0 }),
        expect.objectContaining({ text: '00', kind: 'second', rangeIndex: 0 }),
        expect.objectContaining({ text: '000', kind: 'millisecond', rangeIndex: 0 }),
        expect.objectContaining({ text: 'to', kind: 'separator', navigable: false }),
        expect.objectContaining({ text: 'May', kind: 'month', rangeIndex: 1 }),
        expect.objectContaining({ text: '6', kind: 'day', rangeIndex: 1 }),
        expect.objectContaining({ text: '2026', kind: 'year', rangeIndex: 1 }),
        expect.objectContaining({ text: '23', kind: 'hour', rangeIndex: 1 }),
        expect.objectContaining({ text: '59', kind: 'minute', rangeIndex: 1 }),
        expect.objectContaining({ text: '59', kind: 'second', rangeIndex: 1 }),
        expect.objectContaining({ text: '999', kind: 'millisecond', rangeIndex: 1 }),
      ]);
    });
  });

  describe('parseDisplayParts', () => {
    it('splits compact display text with no range side', () => {
      expect(parseDisplayParts('Last 24 hours')).toEqual([
        expect.objectContaining({
          text: 'Last',
          kind: 'relative-direction',
          navigable: true,
          rangeIndex: null,
        }),
        expect.objectContaining({
          text: '24',
          kind: 'relative-value',
          navigable: true,
          rangeIndex: null,
        }),
        expect.objectContaining({
          text: 'hours',
          kind: 'relative-unit',
          navigable: true,
          rangeIndex: null,
        }),
      ]);
    });

    // Mirrors parse_text.ts's durationPast templates which accept both "last" and "past".
    it('treats "past N units" the same as "last N units"', () => {
      expect(parseDisplayParts('Past 7 days')).toEqual([
        expect.objectContaining({
          text: 'Past',
          kind: 'relative-direction',
          navigable: true,
          rangeIndex: null,
        }),
        expect.objectContaining({
          text: '7',
          kind: 'relative-value',
          navigable: true,
          rangeIndex: null,
        }),
        expect.objectContaining({
          text: 'days',
          kind: 'relative-unit',
          navigable: true,
          rangeIndex: null,
        }),
      ]);
    });

    it('classifies time-only end display parts as hour and minute', () => {
      expect(parseDisplayParts('May 5, 00:00 → 23:59')).toEqual([
        expect.objectContaining({ text: 'May', kind: 'month', rangeIndex: 0 }),
        expect.objectContaining({ text: '5', kind: 'day', rangeIndex: 0 }),
        expect.objectContaining({ text: '00', kind: 'hour', rangeIndex: 0 }),
        expect.objectContaining({ text: '00', kind: 'minute', rangeIndex: 0 }),
        expect.objectContaining({ text: '→', kind: 'separator', navigable: false }),
        expect.objectContaining({ text: '23', kind: 'hour', rangeIndex: 1 }),
        expect.objectContaining({ text: '59', kind: 'minute', rangeIndex: 1 }),
      ]);
    });

    it('leaves named labels without date fields as plain text', () => {
      expect(parseDisplayParts('Today')).toEqual([]);
    });
  });
});
