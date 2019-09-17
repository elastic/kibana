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

import { getStackAccessors } from './stack_format';
import { X_ACCESSOR_INDEX, STACKED_OPTIONS } from '../../../constants';

describe('src/legacy/core_plugins/metrics/public/visualizations/views/timeseries/utils/stack_format.js', () => {
  describe('getStackAccessors()', () => {
    test('should return an accessor if the stack is stacked', () => {
      expect(getStackAccessors(STACKED_OPTIONS.STACKED)).toEqual([X_ACCESSOR_INDEX]);
    });

    test('should return an accessor if the stack is percent', () => {
      expect(getStackAccessors(STACKED_OPTIONS.PERCENT)).toEqual([X_ACCESSOR_INDEX]);
    });

    test('should return undefined if the stack does not match with STACKED and PERCENT', () => {
      expect(getStackAccessors(STACKED_OPTIONS.NONE)).toBeUndefined();
    });
  });
});
