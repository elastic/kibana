/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableColumn } from '@kbn/expressions-plugin/common';

import { getSecondaryMetricInfo } from './secondary_metric_info';
import type {
  SecondaryMetricInfo,
  SecondaryMetricInfoArgs,
  TrendConfig,
} from './secondary_metric_info';

const VALUE = 42;
const STATIC_COLOR = ' #FFB300';
const COLUMN_NAME = 'Column name';
const SECONDARY_PREFIX = 'Secondary prefix';
const PALETTE: [string, string, string] = ['#f00', '#0f0', '#00f'];

const BASELINE_VALUE = 40;

const INCREASE_ICON = '↑';
const DECREASE_ICON = '↓';
const STABLE_ICON = '=';

describe('getSecondaryMetricInfo', () => {
  const columns = [
    { id: 'secondary', name: COLUMN_NAME, meta: { type: 'number' } } as DatatableColumn,
  ];
  const row = { secondary: VALUE };
  const config = {
    metric: {
      secondaryPrefix: SECONDARY_PREFIX,
      secondaryTrend: {},
      secondaryColor: 'red',
    },
    dimensions: {
      secondaryMetric: 'secondary',
    },
  };
  const getMetricFormatter = jest.fn(() => (value: any) => value && String(value));

  const defaultSecondaryMetricInfoArgs: SecondaryMetricInfoArgs = {
    columns,
    row,
    config,
    getMetricFormatter,
  };

  it('returns label when there is a prefix', () => {
    const result = getSecondaryMetricInfo(defaultSecondaryMetricInfoArgs);
    expect(result.label).toBe(SECONDARY_PREFIX);
  });

  it('returns label when we do not show the prefix', () => {
    const _config = { ...config, metric: { ...config.metric, secondaryPrefix: '' } };
    const result = getSecondaryMetricInfo({ ...defaultSecondaryMetricInfoArgs, config: _config });
    expect(result.label).toBe('');
  });

  it('returns label when there is auto prefix', () => {
    const _config = { ...config, metric: { ...config.metric, secondaryPrefix: undefined } };
    const result = getSecondaryMetricInfo({ ...defaultSecondaryMetricInfoArgs, config: _config });
    expect(result.label).toBe(COLUMN_NAME);
  });

  it('returns info when staticColor is provided', () => {
    const result = getSecondaryMetricInfo({
      ...defaultSecondaryMetricInfoArgs,
      staticColor: STATIC_COLOR,
    });
    const expected: SecondaryMetricInfo = {
      value: `${VALUE}`,
      label: SECONDARY_PREFIX,
      badgeColor: STATIC_COLOR,
    };

    expect(result).toEqual(expected);
  });

  it('returns info when staticColor and trendConfig are both provided', () => {
    const trendConfig: TrendConfig = {
      showIcon: true,
      showValue: true,
      palette: PALETTE,
      baselineValue: 40,
      borderColor: undefined,
      compareToPrimary: false,
    };
    const result = getSecondaryMetricInfo({
      ...defaultSecondaryMetricInfoArgs,
      staticColor: STATIC_COLOR,
      trendConfig,
    });

    expect(result.badgeColor).toBe(STATIC_COLOR); // staticColor takes precedence
  });

  it('returns info when trendConfig is provided and compareToPrimary is false', () => {
    const trendConfig: TrendConfig = {
      showIcon: true,
      showValue: true,
      palette: PALETTE,
      baselineValue: 40,
      borderColor: undefined,
      compareToPrimary: false,
    };
    const result = getSecondaryMetricInfo({
      columns,
      row,
      config,
      getMetricFormatter,
      trendConfig,
    });

    expect(result.value).toBe(`${VALUE} ↑`);
    expect(result.label).toBe(SECONDARY_PREFIX);
    expect(result.badgeColor).toBe('#00f');
  });

  it('returns info when trendConfig is provided and compareToPrimary is true with NaN delta', () => {
    const trendConfig: TrendConfig = {
      showIcon: true,
      showValue: true,
      palette: PALETTE,
      baselineValue: undefined, // baselineValue is undefined, so delta is NaN
      borderColor: undefined,
      compareToPrimary: true,
    };
    const _config = {
      ...config,
      dimensions: {
        ...config.dimensions,
        primaryMetric: 'primary',
        secondaryMetric: 'secondary',
      },
    };
    const result = getSecondaryMetricInfo({
      columns: [
        { id: 'secondary', name: COLUMN_NAME, meta: { type: 'number' } } as DatatableColumn,
        { id: 'primary', name: 'Primary column', meta: { type: 'number' } } as DatatableColumn,
      ],
      row,
      config: _config,
      getMetricFormatter,
      trendConfig,
    });

    expect(result.value).toBe('N/A');
    expect(result.badgeColor).toBe(PALETTE[1]);
  });

  it('returns info when trendConfig is provided and compareToPrimary is true with decrease (↓)', () => {
    const trendConfig: TrendConfig = {
      showIcon: true,
      showValue: true,
      palette: PALETTE,
      baselineValue: 40,
      borderColor: undefined,
      compareToPrimary: true,
    };

    const _config = {
      ...config,
      dimensions: {
        ...config.dimensions,
        primaryMetric: 'primary',
        secondaryMetric: 'secondary',
      },
    };
    const result = getSecondaryMetricInfo({
      columns: [
        { id: 'secondary', name: COLUMN_NAME, meta: { type: 'number' } } as DatatableColumn,
        { id: 'primary', name: 'Primary column', meta: { type: 'number' } } as DatatableColumn,
      ],
      row,
      config: _config,
      getMetricFormatter,
      trendConfig,
    });

    expect(result.value).toBe(`-2 ${DECREASE_ICON}`);
    expect(result.label).toBe(SECONDARY_PREFIX);
    expect(result.badgeColor).toBe(PALETTE[0]);
  });

  it('returns info when trendConfig is provided and compareToPrimary is true with increase (↑)', () => {
    const trendConfig: TrendConfig = {
      showIcon: true,
      showValue: true,
      palette: PALETTE,
      baselineValue: BASELINE_VALUE,
      borderColor: undefined,
      compareToPrimary: true,
    };
    const rawValue = 30;
    const _row = { secondary: rawValue };
    const _config = {
      ...config,
      dimensions: {
        ...config.dimensions,
        primaryMetric: 'primary',
        secondaryMetric: 'secondary',
      },
    };
    const result = getSecondaryMetricInfo({
      columns: [
        { id: 'secondary', name: COLUMN_NAME, meta: { type: 'number' } } as DatatableColumn,
        { id: 'primary', name: 'Primary column', meta: { type: 'number' } } as DatatableColumn,
      ],
      row: _row,
      config: _config,
      getMetricFormatter,
      trendConfig,
    });

    expect(result.value).toBe(`${-1 * (rawValue - BASELINE_VALUE)} ${INCREASE_ICON}`);
    expect(result.badgeColor).toBe(PALETTE[2]);
  });

  it('returns info when trendConfig is provided and compareToPrimary is true with stable (=)', () => {
    const baseline = 40;
    const trendConfig: TrendConfig = {
      showIcon: true,
      showValue: true,
      palette: PALETTE,
      baselineValue: baseline,
      borderColor: undefined,
      compareToPrimary: true,
    };
    const rawValue = baseline;
    const _row = { secondary: rawValue };
    const _config = {
      ...config,
      dimensions: {
        ...config.dimensions,
        primaryMetric: 'primary',
        secondaryMetric: 'secondary',
      },
    };
    const result = getSecondaryMetricInfo({
      columns: [
        { id: 'secondary', name: COLUMN_NAME, meta: { type: 'number' } } as DatatableColumn,
        { id: 'primary', name: 'Primary column', meta: { type: 'number' } } as DatatableColumn,
      ],
      row: _row,
      config: _config,
      getMetricFormatter,
      trendConfig,
    });

    expect(result.value).toBe(`0 ${STABLE_ICON}`);
    expect(result.badgeColor).toBe(PALETTE[1]);
  });

  it('returns formatted value and label when no static color or trendConfig', () => {
    const result = getSecondaryMetricInfo(defaultSecondaryMetricInfoArgs);
    const expected = { value: `${VALUE}`, label: SECONDARY_PREFIX };

    expect(result).toEqual(expected);
  });

  it('returns empty value when no value is provided and when no staticColor or trendConfig', () => {
    const result = getSecondaryMetricInfo({
      columns,
      row: {}, // no value for 'secondary'
      config,
      getMetricFormatter: jest.fn(() => () => undefined as unknown as string),
    });

    expect(result.value).toBe('');
  });

  it('returns N/A when no value is provided and when trendConfig', () => {
    const trendConfig: TrendConfig = {
      showIcon: true,
      showValue: true,
      palette: PALETTE,
      baselineValue: 40,
      borderColor: undefined,
      compareToPrimary: false,
    };
    const result = getSecondaryMetricInfo({
      columns,
      row: { secondary: undefined },
      config,
      getMetricFormatter: jest.fn(() => () => undefined as unknown as string),
      trendConfig,
    });

    expect(result.value).toBe('N/A');
  });

  it('returns N/A when no value is provided and when staticColor', () => {
    const result = getSecondaryMetricInfo({
      columns,
      row,
      config,
      getMetricFormatter: jest.fn(() => () => undefined as unknown as string),
      staticColor: STATIC_COLOR,
    });

    expect(result.value).toBe('N/A');
  });
});
