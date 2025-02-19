/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { unmuteAlertInstance } from './unmute_alert_instance';

const http = httpServiceMock.createStartContract();

describe('unmuteAlertInstance', () => {
  test('should call mute instance alert API', async () => {
    const result = await unmuteAlertInstance({ http, id: '1/', instanceId: '12/3' });
    expect(result).toEqual(undefined);
    expect(http.post.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/api/alerting/rule/1%2F/alert/12%2F3/_unmute",
        ],
      ]
    `);
  });
});
