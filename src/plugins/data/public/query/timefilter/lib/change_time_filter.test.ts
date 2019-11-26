/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { changeTimeFilter } from './change_time_filter';
import { timefilterServiceMock } from '../timefilter_service.mock';
import { TimeRange, esFilters } from '../../../../common';

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
    const filter: any = { range: { '@timestamp': { gt, lt } } };
    changeTimeFilter(timefilter, filter as esFilters.RangeFilter);

    const { to, from } = timefilter.getTime();

    expect(to).toBe(new Date(lt).toISOString());
    expect(from).toBe(new Date(gt).toISOString());
  });

  test('should change the timefilter to match the range gte/lte', () => {
    const filter: any = { range: { '@timestamp': { gte: gt, lte: lt } } };
    changeTimeFilter(timefilter, filter as esFilters.RangeFilter);

    const { to, from } = timefilter.getTime();

    expect(to).toBe(new Date(lt).toISOString());
    expect(from).toBe(new Date(gt).toISOString());
  });
});
