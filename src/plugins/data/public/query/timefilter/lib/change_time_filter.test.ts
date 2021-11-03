/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { changeTimeFilter } from './change_time_filter';
import { timefilterServiceMock } from '../timefilter_service.mock';
import { TimeRange, RangeFilter } from '../../../../common';

const timefilterMock = timefilterServiceMock.createSetupContract();
const timefilter = timefilterMock.timefilter;

let _time: TimeRange | undefined;

timefilter.setTime.mockImplementation((time: any) => {
  _time = {
    from: time.from.toISOString(),
    to: time.to.toISOString(),
  };
});
timefilter.getTime.mockImplementation(() => {
  return _time!;
});

describe('changeTimeFilter()', () => {
  const gt = 1388559600000;
  const lt = 1388646000000;

  test('should change the timefilter to match the range gt/lt', () => {
    const filter: any = { query: { range: { '@timestamp': { gt, lt } } } };
    changeTimeFilter(timefilter, filter as RangeFilter);

    const { to, from } = timefilter.getTime();

    expect(to).toBe(new Date(lt).toISOString());
    expect(from).toBe(new Date(gt).toISOString());
  });

  test('should change the timefilter to match the range gte/lte', () => {
    const filter: any = { query: { range: { '@timestamp': { gte: gt, lte: lt } } } };
    changeTimeFilter(timefilter, filter as RangeFilter);

    const { to, from } = timefilter.getTime();

    expect(to).toBe(new Date(lt).toISOString());
    expect(from).toBe(new Date(gt).toISOString());
  });
});
