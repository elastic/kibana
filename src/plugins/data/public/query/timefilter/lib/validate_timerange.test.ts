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

import { validateTimeRange } from './validate_timerange';

describe('Validate timerange', () => {
  test('Validate no range', () => {
    const ok = validateTimeRange();

    expect(ok).toBe(false);
  });
  test('normal range', () => {
    const ok = validateTimeRange({
      to: 'now',
      from: 'now-7d',
    });

    expect(ok).toBe(true);
  });
  test('bad from time', () => {
    const ok = validateTimeRange({
      to: 'nowa',
      from: 'now-7d',
    });

    expect(ok).toBe(false);
  });
  test('bad to time', () => {
    const ok = validateTimeRange({
      to: 'now',
      from: 'nowa-7d',
    });

    expect(ok).toBe(false);
  });
});
