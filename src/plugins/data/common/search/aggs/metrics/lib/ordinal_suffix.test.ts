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

import { forOwn } from 'lodash';
import { ordinalSuffix } from './ordinal_suffix';

describe('ordinal suffix util', () => {
  const checks = {
    1: 'st',
    2: 'nd',
    3: 'rd',
    4: 'th',
    5: 'th',
    6: 'th',
    7: 'th',
    8: 'th',
    9: 'th',
    10: 'th',
    11: 'th',
    12: 'th',
    13: 'th',
    14: 'th',
    15: 'th',
    16: 'th',
    17: 'th',
    18: 'th',
    19: 'th',
    20: 'th',
    21: 'st',
    22: 'nd',
    23: 'rd',
    24: 'th',
    25: 'th',
    26: 'th',
    27: 'th',
    28: 'th',
    29: 'th',
    30: 'th',
  };

  forOwn(checks, (expected, num: any) => {
    const int = parseInt(num, 10);
    const float = int + Math.random();

    it('knowns ' + int, () => {
      expect(ordinalSuffix(num)).toBe(num + '' + expected);
    });

    it('knows ' + float, () => {
      expect(ordinalSuffix(num)).toBe(num + '' + expected);
    });
  });
});
