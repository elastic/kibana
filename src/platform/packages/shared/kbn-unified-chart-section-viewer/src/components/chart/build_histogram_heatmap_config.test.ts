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

const cellColors = (color: string, background: string): string[] =>
  buildHistogramHeatmapConfig({
    query,
    title: 'latency',
    seriesColor: color,
    backgroundColor: background,
  }).palette?.colors ?? [];

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
      palette: {
        colors: cellColors(seriesColor, backgroundColor),
      },
    });
  });

  it('tints the series color from the panel background', () => {
    const pale = cellColors('#A6EDEA', backgroundColor);
    const dim = cellColors('#1B3A6B', '#111217');
    const blue = cellColors(seriesColor, backgroundColor);
    const orange = cellColors('#F5A700', backgroundColor);

    for (const [colors, color, background] of [
      [pale, '#A6EDEA', backgroundColor],
      [dim, '#1B3A6B', '#111217'],
      [blue, seriesColor, backgroundColor],
    ] as const) {
      expect(colors).toHaveLength(LENS_HEATMAP_DEFAULT_COLOR_STEPS);
      expect(colors[colors.length - 1].toLowerCase()).toBe(color.toLowerCase());
      expect(colors[0].toLowerCase()).not.toBe(background.toLowerCase());
      expect(colors[0].toLowerCase()).not.toBe(color.toLowerCase());
      expect(contrast(colors[0], background)).toBeLessThan(
        contrast(colors[colors.length - 1], background)
      );
    }

    expect(blue[0]).not.toBe(orange[0]);
    expect(blue[blue.length - 1]).not.toBe(orange[orange.length - 1]);
  });
});
