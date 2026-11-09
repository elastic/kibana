/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getYAxisLabels } from './axis_labels';

const stats = { min: 120_000, p90: 0, p95: 0, p99: 90_000_000, max: 5_000_000_000, spans: 1 };

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
