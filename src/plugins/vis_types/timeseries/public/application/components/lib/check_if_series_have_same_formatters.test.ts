/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { checkIfSeriesHaveSameFormatters } from './check_if_series_have_same_formatters';
import { DATA_FORMATTERS } from '../../../../common/enums';
import type { Series } from '../../../../common/types';

describe('checkIfSeriesHaveSameFormatters(seriesModel, fieldFormatMap)', () => {
  const fieldFormatMap = {
    someField: { id: 'string', params: { transform: 'upper' } },
    anotherField: { id: 'number', params: { pattern: '$0,0.[00]' } },
  };

  it('should return true for the same series formatters', () => {
    const seriesModel = [
      { formatter: DATA_FORMATTERS.BYTES, metrics: [{ field: 'someField' }] },
      { formatter: DATA_FORMATTERS.BYTES, metrics: [{ field: 'anotherField' }] },
    ] as Series[];
    const result = checkIfSeriesHaveSameFormatters(seriesModel, fieldFormatMap);

    expect(result).toBe(true);
  });

  it('should return true for the different value_template series formatters', () => {
    const seriesModel = [
      {
        formatter: DATA_FORMATTERS.PERCENT,
        value_template: '{{value}} first',
      },
      {
        formatter: DATA_FORMATTERS.PERCENT,
        value_template: '{{value}} second',
      },
    ] as Series[];
    const result = checkIfSeriesHaveSameFormatters(seriesModel, fieldFormatMap);

    expect(result).toBe(true);
  });

  it('should return true for the same field formatters', () => {
    const seriesModel = [
      { formatter: DATA_FORMATTERS.DEFAULT, metrics: [{ type: 'avg', field: 'someField' }] },
      { formatter: DATA_FORMATTERS.DEFAULT, metrics: [{ type: 'avg', field: 'someField' }] },
    ] as Series[];
    const result = checkIfSeriesHaveSameFormatters(seriesModel, fieldFormatMap);

    expect(result).toBe(true);
  });

  it('should return true in case of separate y-axis and different field formatters', () => {
    const seriesModel = [
      { formatter: DATA_FORMATTERS.DEFAULT, metrics: [{ type: 'avg', field: 'someField' }] },
      {
        formatter: DATA_FORMATTERS.DEFAULT,
        separate_axis: 1,
        metrics: [{ id: 'avg', field: 'anotherField' }],
      },
    ] as Series[];
    const result = checkIfSeriesHaveSameFormatters(seriesModel, fieldFormatMap);

    expect(result).toBeTruthy();
  });

  it('should return false for the different field formatters', () => {
    const seriesModel = [
      { formatter: DATA_FORMATTERS.DEFAULT, metrics: [{ type: 'avg', field: 'someField' }] },
      {
        formatter: DATA_FORMATTERS.DEFAULT,

        metrics: [{ id: 'avg', field: 'anotherField' }],
      },
    ] as Series[];
    const result = checkIfSeriesHaveSameFormatters(seriesModel, fieldFormatMap);

    expect(result).toBe(false);
  });

  it('should return false for when there is no custom formatter for a field', () => {
    const seriesModel = [
      {
        formatter: DATA_FORMATTERS.DEFAULT,

        metrics: [
          { type: 'avg', field: 'someField' },
          { type: 'avg', field: 'field' },
        ],
      },
      { formatter: DATA_FORMATTERS.DEFAULT, metrics: [{ type: 'avg', field: 'someField' }] },
    ] as Series[];
    const result = checkIfSeriesHaveSameFormatters(seriesModel, fieldFormatMap);

    expect(result).toBe(false);
  });
});
