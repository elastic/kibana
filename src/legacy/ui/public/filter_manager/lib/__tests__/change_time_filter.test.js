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

jest.mock('ui/chrome',
  () => ({
    getBasePath: () => `/some/base/path`,
    getUiSettingsClient: () => {
      return {
        get: (key) => {
          switch(key) {
            case 'timepicker:timeDefaults':
              return { from: 'now-15m', to: 'now' };
            case 'timepicker:refreshIntervalDefaults':
              return { pause: false, value: 0 };
            default:
              throw new Error(`Unexpected config key: ${key}`);
          }
        }
      };
    },
  }), { virtual: true });

import expect from '@kbn/expect';
import { changeTimeFilter } from '../change_time_filter';
import { timefilter } from 'ui/timefilter';

describe('changeTimeFilter()', function () {
  const gt = 1388559600000;
  const lt = 1388646000000;

  test('should change the timefilter to match the range gt/lt', function () {
    const filter = { range: { '@timestamp': { gt, lt } } };
    changeTimeFilter(filter);
    const { to, from } = timefilter.getTime();
    expect(to).to.be(new Date(lt).toISOString());
    expect(from).to.be(new Date(gt).toISOString());
  });

  test('should change the timefilter to match the range gte/lte', function () {
    const filter = { range: { '@timestamp': { gte: gt, lte: lt } } };
    changeTimeFilter(filter);
    const { to, from } = timefilter.getTime();
    expect(to).to.be(new Date(lt).toISOString());
    expect(from).to.be(new Date(gt).toISOString());
  });

});
