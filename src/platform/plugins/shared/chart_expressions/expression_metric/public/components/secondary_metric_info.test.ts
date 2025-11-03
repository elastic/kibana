/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { VisParams } from '@kbn/visualizations-common';
import { getMetricFormatter } from './helpers';
import { getSecondaryMetricInfo } from './secondary_metric_info';
import type {
  SecondaryMetricInfo,
  SecondaryMetricInfoArgs,
  TrendConfig,
} from './secondary_metric_info';

const VALUE = 42;
const STATIC_COLOR = ' #FFB300';
const COLUMN_NAME = 'Column name';
const SECONDARY_LABEL = 'Secondary label';
const PALETTE: [string, string, string] = ['#f00', '#0f0', '#00f'];

const BASELINE_VALUE = 40;

const INCREASE_ICON = '↑';
const DECREASE_ICON = '↓';
const STABLE_ICON = '=';

jest.mock('./helpers', () => ({
  getMetricFormatter: jest.fn(() => (value: any) => value && String(value)),
}));

const mockGetMetricFormatter = jest.mocked(getMetricFormatter);

describe('getSecondaryMetricInfo', () => {
  const columns = [
    { id: 'secondary', name: COLUMN_NAME, meta: { type: 'number' } } as DatatableColumn,
  ];
  const row = { secondary: VALUE };
  const config: Pick<VisParams, 'metric' | 'dimensions'> = {
    metric: {
      secondaryLabel: SECONDARY_LABEL,
      secondaryTrend: {},
      secondaryColor: 'red',
    },
    dimensions: {
      secondaryMetric: 'secondary',
    },
  };

  const defaultSecondaryMetricInfoArgs: SecondaryMetricInfoArgs = {
    row,
    columns,
    secondaryMetric: config.dimensions.secondaryMetric,
    secondaryLabel: config.metric.secondaryLabel,
  };

  const defaultTrendConfig: TrendConfig = {
    showIcon: true,
    showValue: true,
    palette: PALETTE,
    baselineValue: BASELINE_VALUE,
    borderColor: undefined,
    compareToPrimary: false,
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns label when there is a prefix', () => {
    const result = getSecondaryMetricInfo({
      ...defaultSecondaryMetricInfoArgs,
    });
    expect(result.label).toBe(SECONDARY_LABEL);
  });

  it('returns label when we do not show the prefix', () => {
    const result = getSecondaryMetricInfo({
      ...defaultSecondaryMetricInfoArgs,
      secondaryLabel: '',
    });
    expect(result.label).toBe('');
  });

  it('returns label when there is auto prefix', () => {
    const result = getSecondaryMetricInfo({
      ...defaultSecondaryMetricInfoArgs,
      secondaryLabel: undefined,
    });
    expect(result.label).toBe(COLUMN_NAME);
  });

  it('returns info when staticColor is provided', () => {
    const result = getSecondaryMetricInfo({
      ...defaultSecondaryMetricInfoArgs,
      staticColor: STATIC_COLOR,
    });
    const expected: SecondaryMetricInfo = {
      value: `${VALUE}`,
      label: SECONDARY_LABEL,
      badgeColor: STATIC_COLOR,
    };

    expect(result).toEqual(expected);
  });

  it('returns info when staticColor and trendConfig are both provided', () => {
    const result = getSecondaryMetricInfo({
      ...defaultSecondaryMetricInfoArgs,
      trendConfig: defaultTrendConfig,
      staticColor: STATIC_COLOR,
    });

    expect(result.badgeColor).toBe(STATIC_COLOR); // staticColor takes precedence
  });

  it('returns info when trendConfig is provided and compareToPrimary is false', () => {
    const result = getSecondaryMetricInfo({
      ...defaultSecondaryMetricInfoArgs,
      trendConfig: defaultTrendConfig,
    });

    expect(result.value).toBe(`${VALUE}`);
    expect(result.icon).toBe(INCREASE_ICON);
    expect(result.label).toBe(SECONDARY_LABEL);
    expect(result.badgeColor).toBe('#00f');
  });

  it('returns info when trendConfig is provided and compareToPrimary is true with NaN delta', () => {
    const result = getSecondaryMetricInfo({
      ...defaultSecondaryMetricInfoArgs,
      columns: [
        { id: 'secondary', name: COLUMN_NAME, meta: { type: 'number' } } as DatatableColumn,
        { id: 'primary', name: 'Primary column', meta: { type: 'number' } } as DatatableColumn,
      ],
      trendConfig: {
        ...defaultTrendConfig,
        baselineValue: undefined, // baselineValue is undefined, so delta is NaN
        compareToPrimary: true,
      },
    });

    expect(result.value).toBe('N/A');
    expect(result.badgeColor).toBe(PALETTE[1]);
  });

  it('returns info when trendConfig is provided and compareToPrimary is true with decrease (↓)', () => {
    const result = getSecondaryMetricInfo({
      ...defaultSecondaryMetricInfoArgs,
      columns: [
        { id: 'secondary', name: COLUMN_NAME, meta: { type: 'number' } } as DatatableColumn,
        { id: 'primary', name: 'Primary column', meta: { type: 'number' } } as DatatableColumn,
      ],
      trendConfig: {
        ...defaultTrendConfig,
        compareToPrimary: true,
      },
    });

    expect(result.value).toBe(`-2`);
    expect(result.icon).toBe(DECREASE_ICON);
    expect(result.label).toBe(SECONDARY_LABEL);
    expect(result.badgeColor).toBe(PALETTE[0]);
  });

  it('returns info when trendConfig is provided and compareToPrimary is true with increase (↑)', () => {
    const rawValue = 30;
    const result = getSecondaryMetricInfo({
      ...defaultSecondaryMetricInfoArgs,
      row: { secondary: rawValue },
      columns: [
        { id: 'secondary', name: COLUMN_NAME, meta: { type: 'number' } } as DatatableColumn,
        { id: 'primary', name: 'Primary column', meta: { type: 'number' } } as DatatableColumn,
      ],
      trendConfig: {
        ...defaultTrendConfig,
        compareToPrimary: true,
      },
    });

    expect(result.value).toBe(`${-1 * (rawValue - BASELINE_VALUE)}`);
    expect(result.icon).toBe(INCREASE_ICON);
    expect(result.badgeColor).toBe(PALETTE[2]);
  });

  it('returns info when trendConfig is provided and compareToPrimary is true with stable (=)', () => {
    const result = getSecondaryMetricInfo({
      ...defaultSecondaryMetricInfoArgs,
      row: { secondary: BASELINE_VALUE },
      columns: [
        { id: 'secondary', name: COLUMN_NAME, meta: { type: 'number' } } as DatatableColumn,
        { id: 'primary', name: 'Primary column', meta: { type: 'number' } } as DatatableColumn,
      ],
      trendConfig: {
        ...defaultTrendConfig,
        compareToPrimary: true,
      },
    });

    expect(result.value).toBe('0');
    expect(result.icon).toBe(STABLE_ICON);
    expect(result.badgeColor).toBe(PALETTE[1]);
  });

  it('returns formatted value and label when no static color or trendConfig', () => {
    const result = getSecondaryMetricInfo({
      ...defaultSecondaryMetricInfoArgs,
    });
    const expected = { value: `${VALUE}`, label: SECONDARY_LABEL };
    expect(result).toEqual(expected);
  });

  it('returns empty value when no value is provided and when no staticColor or trendConfig', () => {
    mockGetMetricFormatter.mockReturnValue(() => undefined as unknown as string);

    const result = getSecondaryMetricInfo({
      ...defaultSecondaryMetricInfoArgs,
      row: {}, // no value for 'secondary
    });

    expect(result.value).toBe('');
  });

  it('returns N/A when no value is provided and when trendConfig', () => {
    mockGetMetricFormatter.mockReturnValue(() => undefined as unknown as string);

    const result = getSecondaryMetricInfo({
      ...defaultSecondaryMetricInfoArgs,
      row: { secondary: undefined },
      trendConfig: defaultTrendConfig,
    });

    expect(result.value).toBe('N/A');
  });

  it('returns N/A when no value is provided and when staticColor', () => {
    mockGetMetricFormatter.mockReturnValue(() => undefined as unknown as string);

    const result = getSecondaryMetricInfo({
      ...defaultSecondaryMetricInfoArgs,
      row: { secondary: undefined },
      staticColor: STATIC_COLOR,
    });

    expect(result.value).toBe('N/A');
  });
});
