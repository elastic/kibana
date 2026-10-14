/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { makeHighContrastColor, shade, tint } from '@elastic/eui';
import {
  buildHistogramHeatmapColor,
  buildHistogramHeatmapConfig,
} from './build_histogram_heatmap_config';
import { getHeatmapValueFormat } from '../../common/utils/metric_unit/get_heatmap_value_format';

const query = 'TS metrics-a | STATS count = COUNT(latency) BY bucket, TBUCKET(100)';
const seriesColor = '#54B399';
const lightBackground = '#FFFFFF';
const darkBackground = '#07101F';
const paleSeriesColor = '#A6EDEA';

describe('buildHistogramHeatmapColor', () => {
  it('darkens a pale series color on a light panel and leaves a contrasting color alone', () => {
    const pale = buildHistogramHeatmapColor(paleSeriesColor, 'LIGHT', lightBackground);
    const readablePale = makeHighContrastColor(paleSeriesColor, 2.5)(lightBackground);

    expect(pale.steps[4].color).toBe(readablePale);
    expect(pale.steps[4].color).not.toBe(paleSeriesColor);
    expect(pale.steps[0].color).toBe(tint(readablePale, 0.7));

    const alreadyVisible = '#61A2FF';
    expect(
      buildHistogramHeatmapColor(alreadyVisible, 'LIGHT', lightBackground).steps[4].color
    ).toBe(alreadyVisible.toLowerCase());
  });

  it('separates dark-theme low counts from a brighter high band', () => {
    const darkSeriesColor = '#16C5C0';
    const dark = buildHistogramHeatmapColor(darkSeriesColor, 'DARK', darkBackground);
    const readable = makeHighContrastColor(darkSeriesColor, 2.5)(darkBackground);

    expect(dark.steps[0].color).toBe(shade(readable, 0.45));
    expect(dark.steps[4].color).toBe(tint(readable, 0.4));
    expect(dark.steps[0].color).not.toBe(dark.steps[4].color);
  });
});

describe('buildHistogramHeatmapConfig', () => {
  it('builds the Lens API heatmap with the distribution defaults', () => {
    expect(
      buildHistogramHeatmapConfig({
        query,
        title: 'latency',
        description: 'from metrics-a',
        valueFormat: getHeatmapValueFormat('ms'),
        seriesColor,
        colorMode: 'LIGHT',
        backgroundColor: lightBackground,
      })
    ).toEqual({
      type: 'heatmap',
      title: 'latency',
      description: 'from metrics-a',
      sampling: 1,
      ignore_global_filters: false,
      data_source: { type: 'esql', query },
      metric: {
        column: 'count',
        label: 'Count',
        format: { type: 'number', compact: true, decimals: 0 },
        color: buildHistogramHeatmapColor(seriesColor, 'LIGHT', lightBackground),
      },
      x: { column: 'TBUCKET(100)', label: 'Time' },
      y: {
        column: 'bucket',
        label: 'Value',
        format: { type: 'duration', from: 'ms', to: 'auto', decimals: 0 },
      },
      axis: {
        x: {
          labels: { visible: true },
          title: { visible: false },
          scale: 'temporal',
        },
        y: {
          labels: { visible: true },
          title: { visible: false },
          sort: 'desc',
        },
      },
      legend: { visibility: 'hidden', position: 'right' },
      styling: { cells: { labels: { visible: false } } },
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
      }).y
    ).toEqual({ column: 'bucket', label: 'Value' });
  });
});
