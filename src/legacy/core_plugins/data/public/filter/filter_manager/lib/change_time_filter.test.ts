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
import './change_time_filter.test.mocks';
import { RangeFilter, buildRangeFilter } from '@kbn/es-query';
import { timefilter } from 'ui/timefilter';
import { changeTimeFilter } from './change_time_filter';

jest.mock(
  'ui/chrome',
  () => ({
    getBasePath: () => `/some/base/path`,
    getUiSettingsClient: () => {
      return {
        get: (key: string) => {
          switch (key) {
            case 'timepicker:timeDefaults':
              return { from: 'now-15m', to: 'now' };
            case 'timepicker:refreshIntervalDefaults':
              return { pause: false, value: 0 };
            default:
              throw new Error(`Unexpected config key: ${key}`);
          }
        },
      };
    },
  }),
  { virtual: true }
);

describe('changeTimeFilter()', () => {
  test('should change the timefilter to match the range gt/lt', () => {
    const gt = 1488559600000;
    const lt = 1488646000000;
    const filter: RangeFilter = buildRangeFilter({ name: '@timestamp' }, { gt, lt }, 'index');

    changeTimeFilter(filter);

    const time = timefilter.getTime();

    expect(time.from).toBe(new Date(gt).toISOString());
    expect(time.to).toBe(new Date(lt).toISOString());
  });

  test('should change the timefilter to match the range gte/lte', () => {
    const gte = 1588559600000;
    const lte = 1588646000000;
    const filter: RangeFilter = buildRangeFilter({ name: '@timestamp' }, { gte, lte }, 'index');

    changeTimeFilter(filter);

    const time = timefilter.getTime();

    expect(time.from).toBe(new Date(gte).toISOString());
    expect(time.to).toBe(new Date(lte).toISOString());
  });
});
