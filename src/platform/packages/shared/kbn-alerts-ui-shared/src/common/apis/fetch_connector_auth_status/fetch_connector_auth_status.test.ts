/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { fetchConnectorAuthStatus } from './fetch_connector_auth_status';

const http = httpServiceMock.createStartContract();

beforeEach(() => jest.resetAllMocks());

describe('fetchConnectorAuthStatus', () => {
  test('calls POST auth_status API and transforms the response', async () => {
    http.post.mockResolvedValueOnce({
      'connector-1': { user_auth_status: 'connected' },
      'connector-2': { user_auth_status: 'not_connected' },
    });

    const result = await fetchConnectorAuthStatus({ http });

    const [path, options] = http.post.mock.calls[0] as unknown as [string, { body: string }];
    expect(path).toBe('/internal/actions/connectors/_me/auth_status');
    expect(options).toEqual({ body: '{}' });
    expect(result).toEqual({
      'connector-1': { userAuthStatus: 'connected' },
      'connector-2': { userAuthStatus: 'not_connected' },
    });
  });
});
