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

import { validateTimeRange } from './validate_time_range';
import { notificationServiceMock } from '../../../../../core/public/mocks';

describe('Discover validateTimeRange', () => {
  test('validates given time ranges correctly', async () => {
    const { toasts } = notificationServiceMock.createStartContract();
    [
      { from: '', to: '', result: false },
      { from: 'now', to: 'now+1h', result: true },
      { from: 'now', to: 'lala+1h', result: false },
      { from: '', to: 'now', result: false },
      { from: 'now', to: '', result: false },
      { from: ' 2020-06-02T13:36:13.689Z', to: 'now', result: true },
      { from: ' 2020-06-02T13:36:13.689Z', to: '2020-06-02T13:36:13.690Z', result: true },
    ].map((test) => {
      expect(validateTimeRange({ from: test.from, to: test.to }, toasts)).toEqual(test.result);
    });
  });

  test('displays a toast when invalid data is entered', async () => {
    const { toasts } = notificationServiceMock.createStartContract();
    expect(validateTimeRange({ from: 'now', to: 'null' }, toasts)).toEqual(false);
    expect(toasts.addDanger).toHaveBeenCalledWith({
      title: 'Invalid time range',
      text: "The provided time range is invalid. (from: 'now', to: 'null')",
    });
  });
});
