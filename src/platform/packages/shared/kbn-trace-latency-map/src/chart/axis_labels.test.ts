/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getTimeGrid } from '../query/time_grid';
import { getXAxisLabels, getYAxisLabels } from './axis_labels';

const stats = { min: 120, p90: 0, p95: 0, p99: 90_000, max: 5_000_000, spans: 1 };

describe('getYAxisLabels', () => {
  it('labels the rows with the round durations inside them, and the top row from the p99', () => {
    const labels = getYAxisLabels(stats, 0);
    expect([...labels.values()]).toContain('1ms');
    expect([...labels.values()]).toContain('10ms');
    expect(labels.get(23)).toBe('≥90ms');
  });

  it('labels a row once and keeps the labels apart', () => {
    const labels = getYAxisLabels(stats, 3);
    const rows = [...labels.keys()].sort((a, b) => a - b);
    rows.slice(1).forEach((row, i) => expect(row - rows[i]).toBeGreaterThanOrEqual(3));
    expect(labels.get(23)).toBe('≥90ms');
  });

  it('puts labels in rows that are inside the map', () => {
    [...getYAxisLabels(stats, 1).keys()].forEach((row) => {
      expect(row).toBeGreaterThanOrEqual(0);
      expect(row).toBeLessThan(24);
    });
  });
});

describe('getXAxisLabels', () => {
  const timeGrid = getTimeGrid('2026-10-26T10:03:20.000Z', '2026-10-26T10:33:20.000Z', 60);

  it('labels the column each round time falls in', () => {
    const labels = getXAxisLabels(timeGrid, 6, 'UTC');
    expect([...labels.values()].slice(0, 3)).toEqual(['10:05', '10:10', '10:15']);
    expect(
      labels.get(
        Math.round((Date.parse('2026-10-26T10:05:00Z') - timeGrid.fromMs) / timeGrid.binMs)
      )
    ).toBe('10:05');
  });

  it('leaves out ticks outside the columns', () => {
    getXAxisLabels(timeGrid, 6, 'UTC').forEach((_, column) => {
      expect(column).toBeGreaterThanOrEqual(0);
      expect(column).toBeLessThan(timeGrid.bins);
    });
  });
});
