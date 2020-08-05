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
import { areTimeRangesDifferent } from './diff_time_picker_vals';

describe('Diff Time Picker Values', () => {
  describe('dateMath ranges', () => {
    test('knows a match', () => {
      const diff = areTimeRangesDifferent(
        {
          to: 'now',
          from: 'now-7d',
        },
        {
          to: 'now',
          from: 'now-7d',
        }
      );

      expect(diff).toBe(false);
    });
    test('knows a difference', () => {
      const diff = areTimeRangesDifferent(
        {
          to: 'now',
          from: 'now-7d',
        },
        {
          to: 'now',
          from: 'now-1h',
        }
      );

      expect(diff).toBe(true);
    });
  });

  describe('a dateMath range, and a moment range', () => {
    test('is always different', () => {
      const diff = areTimeRangesDifferent(
        {
          to: moment(),
          from: moment(),
        },
        {
          to: 'now',
          from: 'now-1h',
        }
      );

      expect(diff).toBe(true);
    });
  });

  describe('moment ranges', () => {
    test('uses the time value of moments for comparison', () => {
      const to = moment();
      const from = moment().add(1, 'day');

      const diff = areTimeRangesDifferent(
        {
          to: to.clone(),
          from: from.clone(),
        },
        {
          to: to.clone(),
          from: from.clone(),
        }
      );

      expect(diff).toBe(false);
    });

    test('fails if any to or from is different', () => {
      const to = moment();
      const from = moment().add(1, 'day');
      const from2 = moment().add(2, 'day');

      const diff = areTimeRangesDifferent(
        {
          to: to.clone(),
          from: from.clone(),
        },
        {
          to: to.clone(),
          from: from2.clone(),
        }
      );

      expect(diff).toBe(true);
    });
  });
});
