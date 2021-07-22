/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { checkIfSeriesHaveSameFormatters } from './check_if_series_have_same_formatters';
import type { Series } from '../../../../common/types';

describe('checkIfSeriesHaveSameFormatters(seriesModel, fieldFormatMap)', () => {
  const fieldFormatMap = {
    someField: { id: 'string', params: { transform: 'upper' } },
    anotherField: { id: 'number', params: { pattern: '$0,0.[00]' } },
  };

  it('should return true for the same series formatters when ignore_field_formatting set to true', () => {
    const seriesModel = [
      { formatter: 'byte', ignore_field_formatting: true, metrics: [{ field: 'someField' }] },
      { formatter: 'byte', ignore_field_formatting: true, metrics: [{ field: 'anotherField' }] },
    ] as Series[];
    const result = checkIfSeriesHaveSameFormatters(seriesModel, fieldFormatMap);

    expect(result).toBe(true);
  });

  it('should return false for the different value_template series formatters when ignore_field_formatting set to true', () => {
    const seriesModel = [
      {
        formatter: 'custom',
        value_template: '{{value}} first',
        ignore_field_formatting: true,
      },
      {
        formatter: 'custom',
        value_template: '{{value}} second',
        ignore_field_formatting: true,
      },
    ] as Series[];
    const result = checkIfSeriesHaveSameFormatters(seriesModel, fieldFormatMap);

    expect(result).toBe(false);
  });

  it('should return false the same formatters, but different ignore_field_formatting ', () => {
    const seriesModel = [
      { formatter: 'percent', ignore_field_formatting: true, metrics: [{ field: 'someField' }] },
      { formatter: 'percent', ignore_field_formatting: false, metrics: [{ field: 'someField' }] },
    ] as Series[];
    const result = checkIfSeriesHaveSameFormatters(seriesModel, fieldFormatMap);

    expect(result).toBe(false);
  });

  it('should return true for the same field formatters when ignore_field_formatting set to false', () => {
    const seriesModel = [
      { formatter: 'byte', ignore_field_formatting: false, metrics: [{ field: 'someField' }] },
      { formatter: 'percent', ignore_field_formatting: false, metrics: [{ field: 'someField' }] },
    ] as Series[];
    const result = checkIfSeriesHaveSameFormatters(seriesModel, fieldFormatMap);

    expect(result).toBe(true);
  });

  it('should return false for the different field formatters when ignore_field_formatting set to false', () => {
    const seriesModel = [
      { formatter: 'percent', ignore_field_formatting: false, metrics: [{ field: 'someField' }] },
      {
        formatter: 'percent',
        ignore_field_formatting: false,
        metrics: [{ field: 'anotherField' }],
      },
    ] as Series[];
    const result = checkIfSeriesHaveSameFormatters(seriesModel, fieldFormatMap);

    expect(result).toBe(false);
  });

  it('should return false for when there is no custom formatter for a field and ignore_field_formatting set to false', () => {
    const seriesModel = [
      {
        formatter: 'percent',
        ignore_field_formatting: false,
        metrics: [{ field: 'someField' }, { field: 'field' }],
      },
      { formatter: 'percent', ignore_field_formatting: false, metrics: [{ field: 'someField' }] },
    ] as Series[];
    const result = checkIfSeriesHaveSameFormatters(seriesModel, fieldFormatMap);

    expect(result).toBe(false);
  });
});
