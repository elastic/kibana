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

import moment from 'moment';
import { offsetTime } from './offset_time';

describe('offsetTime(req, by)', () => {
  test('should return a moment object for to and from', () => {
    const req = {
      payload: {
        timerange: {
          min: '2017-01-01T00:00:00Z',
          max: '2017-01-01T01:00:00Z',
        },
      },
    };
    const { from, to } = offsetTime(req, '');
    expect(moment.isMoment(from)).toBeTruthy();
    expect(moment.isMoment(to)).toBeTruthy();
    expect(moment.utc('2017-01-01T00:00:00Z').isSame(from)).toBeTruthy();
    expect(moment.utc('2017-01-01T01:00:00Z').isSame(to)).toBeTruthy();
  });

  test('should return a moment object for to and from offset by 1 hour', () => {
    const req = {
      payload: {
        timerange: {
          min: '2017-01-01T00:00:00Z',
          max: '2017-01-01T01:00:00Z',
        },
      },
    };
    const { from, to } = offsetTime(req, '1h');
    expect(moment.isMoment(from)).toBeTruthy();
    expect(moment.isMoment(to)).toBeTruthy();
    expect(moment.utc('2017-01-01T00:00:00Z').subtract(1, 'h').isSame(from)).toBeTruthy();
    expect(moment.utc('2017-01-01T01:00:00Z').subtract(1, 'h').isSame(to)).toBeTruthy();
  });

  test('should return a moment object for to and from offset by -2 minute', () => {
    const req = {
      payload: {
        timerange: {
          min: '2017-01-10T01:00:00Z',
          max: '2017-01-10T02:00:00Z',
        },
      },
    };
    const { from, to } = offsetTime(req, '-2m');
    expect(moment.isMoment(from)).toBeTruthy();
    expect(moment.isMoment(to)).toBeTruthy();
    expect(moment.utc('2017-01-10T01:02:00Z').isSame(from)).toBeTruthy();
    expect(moment.utc('2017-01-10T02:02:00Z').isSame(to)).toBeTruthy();
  });

  test('should work when prefixing positive offsets with the plus sign', () => {
    const req = {
      payload: {
        timerange: {
          min: '2017-01-10T01:00:00Z',
          max: '2017-01-10T02:00:00Z',
        },
      },
    };
    const { from: fromSigned, to: toSigned } = offsetTime(req, '+1m');
    const { from, to } = offsetTime(req, '1m');

    expect(fromSigned.isSame(from)).toBeTruthy();
    expect(toSigned.isSame(to)).toBeTruthy();
  });
});
