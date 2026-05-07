/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildFocusedViewTimeRange } from './build_change_point_tab_queries';

// Pin "now" so that datemath expressions like "now-30d" resolve to known values.
const FIXED_NOW = new Date('2024-02-01T00:00:00.000Z').getTime();

describe('buildFocusedViewTimeRange', () => {
  const from = '2024-01-01T00:00:00.000Z';
  const to = '2024-02-01T00:00:00.000Z';
  // 31-day range → 3% padding = ~0.93 days
  const totalMs = new Date(to).getTime() - new Date(from).getTime();
  const padding = totalMs * 0.03;

  describe('absolute time ranges', () => {
    it('centres the window on a single annotation', () => {
      const annotationDatetime = '2024-01-16T00:00:00.000Z';
      const cpMs = new Date(annotationDatetime).getTime();

      const result = buildFocusedViewTimeRange(
        [{ name: 'step_change (p=0.001)', datetime: annotationDatetime }],
        { from, to }
      );

      expect(result).toBeDefined();
      expect(new Date(result!.from).getTime()).toBeCloseTo(cpMs - padding, -3);
      expect(new Date(result!.to).getTime()).toBeCloseTo(cpMs + padding, -3);
    });

    it('spans all annotations when multiple change points exist', () => {
      // Use a wide 3-month range and centrally-placed annotations so the padding
      // does not reach either bound and no clamping occurs.
      const wideFrom = '2024-01-01T00:00:00.000Z';
      const wideTo = '2024-04-01T00:00:00.000Z';
      const wideTotalMs = new Date(wideTo).getTime() - new Date(wideFrom).getTime();
      const widePadding = wideTotalMs * 0.03;

      const first = '2024-01-25T00:00:00.000Z';
      const last = '2024-02-25T00:00:00.000Z';
      const firstMs = new Date(first).getTime();
      const lastMs = new Date(last).getTime();

      const result = buildFocusedViewTimeRange(
        [
          { name: 'step_change (p=0.001)', datetime: first },
          { name: 'trend_change (p=0.002)', datetime: last },
        ],
        { from: wideFrom, to: wideTo }
      );

      expect(result).toBeDefined();
      expect(new Date(result!.from).getTime()).toBeCloseTo(firstMs - widePadding, -3);
      expect(new Date(result!.to).getTime()).toBeCloseTo(lastMs + widePadding, -3);
    });

    it('clamps the window lower bound to the original range start', () => {
      // Annotation very close to `from` — focus window would go before start.
      const annotationDatetime = '2024-01-02T00:00:00.000Z';

      const result = buildFocusedViewTimeRange(
        [{ name: 'step_change (p=0.001)', datetime: annotationDatetime }],
        { from, to }
      );

      expect(result).toBeDefined();
      expect(new Date(result!.from).getTime()).toBeGreaterThanOrEqual(new Date(from).getTime());
    });

    it('clamps the window upper bound to the original range end', () => {
      const annotationDatetime = '2024-01-31T00:00:00.000Z';

      const result = buildFocusedViewTimeRange(
        [{ name: 'step_change (p=0.001)', datetime: annotationDatetime }],
        { from, to }
      );

      expect(result).toBeDefined();
      expect(new Date(result!.to).getTime()).toBeLessThanOrEqual(new Date(to).getTime());
    });
  });

  describe('relative time ranges', () => {
    beforeEach(() => {
      jest.useFakeTimers({ now: FIXED_NOW });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('resolves relative bounds via datemath and applies 3% padding', () => {
      // now=2024-02-01, now-30d=2024-01-02 → 30-day range, 3% padding ≈ 21.6h
      const resolvedFromMs = new Date('2024-01-02T00:00:00.000Z').getTime();
      const resolvedToMs = FIXED_NOW;
      const relativePadding = (resolvedToMs - resolvedFromMs) * 0.03;

      const annotationDatetime = '2024-01-16T00:00:00.000Z';
      const cpMs = new Date(annotationDatetime).getTime();

      const result = buildFocusedViewTimeRange(
        [{ name: 'step_change (p=0.001)', datetime: annotationDatetime }],
        { from: 'now-30d', to: 'now' }
      );

      expect(result).toBeDefined();
      expect(new Date(result!.from).getTime()).toBeCloseTo(cpMs - relativePadding, -3);
      expect(new Date(result!.to).getTime()).toBeCloseTo(cpMs + relativePadding, -3);
    });

    it('spans multiple annotations for a relative range', () => {
      const resolvedFromMs = new Date('2024-01-02T00:00:00.000Z').getTime();
      const resolvedToMs = FIXED_NOW;
      const relativePadding = (resolvedToMs - resolvedFromMs) * 0.03;

      const first = '2024-01-10T00:00:00.000Z';
      const last = '2024-01-25T00:00:00.000Z';
      const firstMs = new Date(first).getTime();
      const lastMs = new Date(last).getTime();

      const result = buildFocusedViewTimeRange(
        [
          { name: 'step_change (p=0.001)', datetime: first },
          { name: 'trend_change (p=0.002)', datetime: last },
        ],
        { from: 'now-30d', to: 'now' }
      );

      expect(result).toBeDefined();
      expect(new Date(result!.from).getTime()).toBeCloseTo(firstMs - relativePadding, -3);
      expect(new Date(result!.to).getTime()).toBeCloseTo(lastMs + relativePadding, -3);
    });
  });

  describe('unresolvable time ranges (template variables)', () => {
    it('returns undefined when bounds cannot be parsed', () => {
      const result = buildFocusedViewTimeRange(
        [{ name: 'step_change (p=0.001)', datetime: '2024-01-16T00:00:00.000Z' }],
        { from: '$timeFrom', to: '$timeTo' }
      );

      expect(result).toBeUndefined();
    });
  });
});
