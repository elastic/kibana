/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { validateTimeRange } from './validate_time_range';
import { notificationServiceMock } from '@kbn/core/public/mocks';

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
