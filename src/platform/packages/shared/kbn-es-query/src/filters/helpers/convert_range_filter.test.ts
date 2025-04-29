/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import { convertRangeFilterToTimeRange } from './convert_range_filter';

describe('convertRangeFilterToTimeRange', () => {
  const gt = 1388559600000;
  const lt = 1388646000000;

  it('should return converted range', () => {
    const filter: any = { query: { range: { '@timestamp': { gte: gt, lte: lt } } } };
    const filterAfterConvertedRangeFilter = {
      from: moment(gt),
      to: moment(lt),
    };
    const convertedRangeFilter = convertRangeFilterToTimeRange(filter);

    expect(convertedRangeFilter).toEqual(filterAfterConvertedRangeFilter);
  });

  it('should return converted range for relative dates', () => {
    const filter: any = { query: { range: { '@timestamp': { gte: 'now-1d', lte: 'now' } } } };
    const filterAfterConvertedRangeFilter = {
      from: 'now-1d',
      to: 'now',
    };
    const convertedRangeFilter = convertRangeFilterToTimeRange(filter);

    expect(convertedRangeFilter).toEqual(filterAfterConvertedRangeFilter);
  });

  it('should return converted range for relative dates without now', () => {
    const filter: any = {
      query: { range: { '@timestamp': { gte: '2024.02.01', lte: '2024.02.01||+1M/d' } } },
    };
    const filterAfterConvertedRangeFilter = {
      from: moment('2024.02.01'),
      to: '2024.02.01||+1M/d',
    };
    const convertedRangeFilter = convertRangeFilterToTimeRange(filter);

    expect(convertedRangeFilter).toEqual(filterAfterConvertedRangeFilter);
  });
});
