/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
});
