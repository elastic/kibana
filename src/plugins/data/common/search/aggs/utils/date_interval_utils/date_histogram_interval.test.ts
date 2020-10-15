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

import { dateHistogramInterval } from './date_histogram_interval';

describe('dateHistogramInterval', () => {
  it('should return calender_interval key for calendar intervals', () => {
    expect(dateHistogramInterval('1m')).toEqual({ calendar_interval: '1m' });
    expect(dateHistogramInterval('1h')).toEqual({ calendar_interval: '1h' });
    expect(dateHistogramInterval('1d')).toEqual({ calendar_interval: '1d' });
    expect(dateHistogramInterval('1w')).toEqual({ calendar_interval: '1w' });
    expect(dateHistogramInterval('1M')).toEqual({ calendar_interval: '1M' });
    expect(dateHistogramInterval('1y')).toEqual({ calendar_interval: '1y' });
  });

  it('should return fixed_interval key for fixed intervals', () => {
    expect(dateHistogramInterval('1ms')).toEqual({ fixed_interval: '1ms' });
    expect(dateHistogramInterval('42ms')).toEqual({ fixed_interval: '42ms' });
    expect(dateHistogramInterval('1s')).toEqual({ fixed_interval: '1s' });
    expect(dateHistogramInterval('42s')).toEqual({ fixed_interval: '42s' });
    expect(dateHistogramInterval('42m')).toEqual({ fixed_interval: '42m' });
    expect(dateHistogramInterval('42h')).toEqual({ fixed_interval: '42h' });
    expect(dateHistogramInterval('42d')).toEqual({ fixed_interval: '42d' });
  });

  it('should throw an error on invalid intervals', () => {
    expect(() => dateHistogramInterval('2w')).toThrow();
    expect(() => dateHistogramInterval('2M')).toThrow();
    expect(() => dateHistogramInterval('2y')).toThrow();
    expect(() => dateHistogramInterval('2')).toThrow();
    expect(() => dateHistogramInterval('y')).toThrow();
    expect(() => dateHistogramInterval('0.5h')).toThrow();
  });
});
