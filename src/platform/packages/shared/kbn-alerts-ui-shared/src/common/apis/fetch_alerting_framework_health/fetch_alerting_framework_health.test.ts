/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { fetchAlertingFrameworkHealth } from '.';

describe('fetchAlertingFrameworkHealth', () => {
  const http = httpServiceMock.createStartContract();
  test('should call fetchAlertingFrameworkHealth API', async () => {
    http.get.mockResolvedValueOnce({
      is_sufficiently_secure: true,
      has_permanent_encryption_key: true,
      alerting_framework_health: {
        decryption_health: { status: 'ok', timestamp: '2021-04-01T21:29:22.991Z' },
        execution_health: { status: 'ok', timestamp: '2021-04-01T21:29:22.991Z' },
        read_health: { status: 'ok', timestamp: '2021-04-01T21:29:22.991Z' },
      },
    });
    const result = await fetchAlertingFrameworkHealth({ http });
    expect(result).toEqual({
      alertingFrameworkHealth: {
        decryptionHealth: { status: 'ok', timestamp: '2021-04-01T21:29:22.991Z' },
        executionHealth: { status: 'ok', timestamp: '2021-04-01T21:29:22.991Z' },
        readHealth: { status: 'ok', timestamp: '2021-04-01T21:29:22.991Z' },
      },
      hasPermanentEncryptionKey: true,
      isSufficientlySecure: true,
    });
    expect(http.get.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/api/alerting/_health",
        ],
      ]
    `);
  });
});
