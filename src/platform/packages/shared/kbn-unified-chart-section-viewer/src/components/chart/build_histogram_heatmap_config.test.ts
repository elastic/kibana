/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { makeHighContrastColor, shade, tint } from '@elastic/eui';
import { getLensMetricFormat } from '../../common/utils';
import {
  buildHistogramHeatmapColor,
  buildHistogramHeatmapConfig,
} from './build_histogram_heatmap_config';

const query = 'TS metrics-a | STATS count = COUNT(latency) BY bucket, TBUCKET(100)';
const seriesColor = '#54B399';
const lightBackground = '#FFFFFF';
const darkBackground = '#07101F';
const paleSeriesColor = '#A6EDEA';

describe('buildHistogramHeatmapColor', () => {
  it('darkens a pale series color on a light panel and leaves a contrasting color alone', () => {
    const pale = buildHistogramHeatmapColor(paleSeriesColor, 'LIGHT', lightBackground);
    const readablePale = makeHighContrastColor(paleSeriesColor, 2.5)(lightBackground);

    expect(pale[4].color).toBe(readablePale);
    expect(pale[4].color).not.toBe(paleSeriesColor);
    expect(pale[0].color).toBe(tint(readablePale, 0.7));

    const alreadyVisible = '#61A2FF';
    expect(buildHistogramHeatmapColor(alreadyVisible, 'LIGHT', lightBackground)[4].color).toBe(
      alreadyVisible.toLowerCase()
    );
  });

  it('separates dark-theme low counts from a brighter high band', () => {
    const darkSeriesColor = '#16C5C0';
    const dark = buildHistogramHeatmapColor(darkSeriesColor, 'DARK', darkBackground);
    const readable = makeHighContrastColor(darkSeriesColor, 2.5)(darkBackground);

    expect(dark[0].color).toBe(shade(readable, 0.45));
    expect(dark[4].color).toBe(tint(readable, 0.4));
    expect(dark[0].color).not.toBe(dark[4].color);
  });
});

describe('buildHistogramHeatmapConfig', () => {
  it('builds the heatmap with the same config builder XY charts use', () => {
    expect(
      buildHistogramHeatmapConfig({
        query,
        title: 'latency',
        description: 'from metrics-a',
        valueFormat: getLensMetricFormat('ms'),
        seriesColor,
        colorMode: 'LIGHT',
        backgroundColor: lightBackground,
      })
    ).toEqual({
      chartType: 'heatmap',
      title: 'latency',
      description: 'from metrics-a',
      dataset: { esql: query },
      value: 'count',
      label: 'Count',
      format: 'number',
      decimals: 0,
      compactValues: true,
      xAxis: { type: 'dateHistogram', field: 'TBUCKET(100)' },
      breakdown: 'bucket',
      breakdownFormat: {
        format: 'duration',
        fromUnit: 'milliseconds',
        toUnit: 'humanizePrecise',
        decimals: 0,
      },
      legend: { show: false, position: 'right' },
      xAxisOptions: { showLabels: true, label: 'Time' },
      yAxisOptions: { showLabels: true, sort: 'desc', label: 'Value' },
      colorSteps: buildHistogramHeatmapColor(seriesColor, 'LIGHT', lightBackground),
    });
  });

  it('omits the value format when the unit is not a supported scale', () => {
    expect(
      buildHistogramHeatmapConfig({
        query,
        title: 'latency',
        seriesColor,
        colorMode: 'LIGHT',
        backgroundColor: lightBackground,
      })
    ).not.toHaveProperty('breakdownFormat');
  });
});
