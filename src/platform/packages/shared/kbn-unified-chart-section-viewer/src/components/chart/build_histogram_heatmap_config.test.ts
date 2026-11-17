/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { calculateContrast, hexToRgb } from '@elastic/eui';
import { LENS_HEATMAP_DEFAULT_COLOR_STEPS } from '@kbn/lens-common';
import { buildHistogramHeatmapConfig } from './build_histogram_heatmap_config';

const query = 'TS metrics-a | STATS count = COUNT(latency) BY bucket, TBUCKET(100)';
const seriesColor = '#1BA9F5';
const backgroundColor = '#FFFFFF';

const contrast = (color: string, background: string): number =>
  calculateContrast(hexToRgb(color), hexToRgb(background));

const cellColors = (color: string, background: string): string[] => {
  const { color: heatmapColor } = buildHistogramHeatmapConfig({
    query,
    title: 'latency',
    seriesColor: color,
    backgroundColor: background,
  });
  return heatmapColor?.type === 'dynamic'
    ? heatmapColor.steps.map(({ color: stepColor }) => stepColor)
    : [];
};

describe('buildHistogramHeatmapConfig', () => {
  it('builds the heatmap with the same config builder XY charts use', () => {
    expect(
      buildHistogramHeatmapConfig({
        query,
        title: 'latency',
        description: 'Data stream: metrics-a',
        seriesColor,
        backgroundColor,
      })
    ).toEqual({
      chartType: 'heatmap',
      title: 'latency',
      description: 'Data stream: metrics-a',
      dataset: { esql: query },
      value: 'count',
      xAxis: 'TBUCKET(100)',
      breakdown: 'bucket',
      legend: { show: false },
      axisLabel: { xAxis: true, yAxis: true },
      color: {
        type: 'dynamic',
        range: 'percentage',
        steps: expect.any(Array),
      },
      ySort: 'desc',
    });
  });

  it('spreads the cell colors evenly across the percentage range', () => {
    const { color } = buildHistogramHeatmapConfig({
      query,
      title: 'latency',
      seriesColor,
      backgroundColor,
    });
    const steps = color?.type === 'dynamic' ? color.steps : [];
    const bandSize = 100 / LENS_HEATMAP_DEFAULT_COLOR_STEPS;

    expect(steps).toHaveLength(LENS_HEATMAP_DEFAULT_COLOR_STEPS);
    expect(steps[0]).toEqual(expect.objectContaining({ gte: 0, lt: bandSize }));
    expect(steps[steps.length - 1]).toEqual(
      expect.objectContaining({ gte: 100 - bandSize, lte: 100 })
    );
  });

  it('keeps a visible series color and deepens a pale one on a light panel', () => {
    const pale = cellColors('#A6EDEA', backgroundColor);
    const blue = cellColors(seriesColor, backgroundColor);
    const orange = cellColors('#F5A700', backgroundColor);

    expect(blue).toHaveLength(LENS_HEATMAP_DEFAULT_COLOR_STEPS);
    expect(blue[blue.length - 1].toLowerCase()).toBe(seriesColor.toLowerCase());
    expect(contrast(blue[0], backgroundColor)).toBeGreaterThan(1.2);
    expect(contrast(blue[0], backgroundColor)).toBeLessThan(1.5);
    expect(contrast(blue[0], backgroundColor)).toBeLessThan(
      contrast(blue[blue.length - 1], backgroundColor)
    );

    expect(pale[pale.length - 1].toLowerCase()).not.toBe('#a6edea');
    expect(contrast(pale[pale.length - 1], backgroundColor)).toBeGreaterThanOrEqual(2.2);
    expect(contrast(pale[pale.length - 1], backgroundColor)).toBeLessThan(2.5);
    expect(contrast(pale[0], backgroundColor)).toBeLessThan(
      contrast(pale[pale.length - 1], backgroundColor)
    );

    expect(blue[0]).not.toBe(orange[0]);
    expect(blue[blue.length - 1]).not.toBe(orange[orange.length - 1]);
  });

  it('lifts a dim series color on a dark panel', () => {
    const background = '#111217';
    const colors = cellColors('#1B3A6B', background);

    expect(colors).toHaveLength(LENS_HEATMAP_DEFAULT_COLOR_STEPS);
    expect(colors[colors.length - 1].toLowerCase()).not.toBe('#1b3a6b');
    expect(contrast(colors[colors.length - 1], background)).toBeGreaterThanOrEqual(2.8);
    expect(contrast(colors[0], background)).toBeGreaterThan(1.3);
    expect(contrast(colors[0], background)).toBeLessThan(
      contrast(colors[colors.length - 1], background)
    );
  });
});
