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

import { getAxisLabelString } from './get_axis_label_string';

jest.mock('ui/new_platform');

describe('getAxisLabelString(interval)', () => {
  test('should return a valid label for 10 seconds', () => {
    expect(getAxisLabelString(10000)).toEqual('per 10 seconds');
  });
  test('should return a valid label for 2 minutes', () => {
    expect(getAxisLabelString(120000)).toEqual('per 2 minutes');
  });
  test('should return a valid label for 2 hour', () => {
    expect(getAxisLabelString(7200000)).toEqual('per 2 hours');
  });
});
