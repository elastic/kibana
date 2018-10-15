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
              return { from: 'now-15m', to: 'now', mode: 'quick' };
            case 'timepicker:refreshIntervalDefaults':
              return { display: 'Off', pause: false, value: 0 };
            default:
              throw new Error(`Unexpected config key: ${key}`);
          }
        }
      };
    },
  }), { virtual: true });

import moment from 'moment';
import expect from 'expect.js';
import { changeTimeFilter } from '../change_time_filter';
import { timefilter } from 'ui/timefilter';

describe('changeTimeFilter()', function () {

  test('should change the timefilter to match the range gt/lt', function () {
    const filter = { range: { '@timestamp': { gt: 1388559600000, lt: 1388646000000 } } };
    changeTimeFilter(filter);
    expect(timefilter.getTime().mode).to.be('absolute');
    expect(moment.isMoment(timefilter.getTime().to)).to.be(true);
    expect(timefilter.getTime().to.isSame('2014-01-02'));
    expect(moment.isMoment(timefilter.getTime().from)).to.be(true);
    expect(timefilter.getTime().from.isSame('2014-01-01'));
  });

  test('should change the timefilter to match the range gte/lte', function () {
    const filter = { range: { '@timestamp': { gte: 1388559600000, lte: 1388646000000 } } };
    changeTimeFilter(filter);
    expect(timefilter.getTime().mode).to.be('absolute');
    expect(moment.isMoment(timefilter.getTime().to)).to.be(true);
    expect(timefilter.getTime().to.isSame('2014-01-02'));
    expect(moment.isMoment(timefilter.getTime().from)).to.be(true);
    expect(timefilter.getTime().from.isSame('2014-01-01'));
  });

});
