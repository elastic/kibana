/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DatatableColumn } from '@kbn/expressions-plugin/common';
import { getSecondaryMetricInfo } from './secondary_metric_info';
import type { SecondaryMetricInfo, SecondaryMetricInfoArgs } from './secondary_metric_info';
import { TrendConfig } from './secondary_metric';

const VALUE = 42;
const STATIC_COLOR = ' #FFB300';

describe('getSecondaryMetricInfo', () => {
  const columns = [
    { id: 'secondary', name: 'Secondary', meta: { type: 'number' } } as DatatableColumn,
  ];
  const row = { secondary: VALUE };
  const config = {
    metric: {
      secondaryPrefix: 'Prefix',
      secondaryTrend: {},
      secondaryColor: 'red',
    },
    dimensions: {
      secondaryMetric: 'secondary',
    },
  };
  const getMetricFormatter = jest.fn(() => (value: any) => String(value));

  const defaultSecondaryMetricInfoArgs: SecondaryMetricInfoArgs = {
    columns,
    row,
    config,
    getMetricFormatter,
  };

  it('returns the correct label when there is a prefix', () => {
    const result = getSecondaryMetricInfo(defaultSecondaryMetricInfoArgs);
    expect(result.label).toBe('Prefix');
  });

  it('returns the correct label when there is no prefix', () => {
    const _config = { ...config, metric: { ...config.metric, secondaryPrefix: '' } };
    const result = getSecondaryMetricInfo({ ...defaultSecondaryMetricInfoArgs, config: _config });
    expect(result.label).toBe('Prefix');
  });

  it('returns the correct label', () => {
    const result = getSecondaryMetricInfo(defaultSecondaryMetricInfoArgs);
    expect(result.label).toBe('Prefix');
  });

  it('returns formatted value and label when no color or trendConfig', () => {
    const result = getSecondaryMetricInfo(defaultSecondaryMetricInfoArgs);
    const expected = { value: `${VALUE}`, label: 'Prefix' };

    expect(result).toEqual(expected);
  });

  it('returns info when static color is provided', () => {
    const result = getSecondaryMetricInfo({
      ...defaultSecondaryMetricInfoArgs,
      staticColor: STATIC_COLOR,
    });
    const expected: SecondaryMetricInfo = {
      value: '42',
      label: 'Prefix',
      badgeColor: STATIC_COLOR,
    };

    expect(result).toEqual(expected);
  });

  it('returns dynamic color info when trendConfig is provided', () => {
    const trendConfig: TrendConfig = {
      icon: true,
      value: true,
      palette: ['#f00', '#0f0', '#00f'],
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

    expect(result.value).toBe('42 ↑');
    expect(result.label).toBe('Prefix');
    expect(result.badgeColor).toBe('#00f');
  });

  it('returns info when trendConfig is provided color is provided', () => {});

  // Test when is no value number
});
