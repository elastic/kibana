/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transformConnectorAuthStatusResponse } from './transform_connector_auth_status_response';

describe('transformConnectorAuthStatusResponse', () => {
  test('maps snake_case user_auth_status to camelCase userAuthStatus for all status values', () => {
    const result = transformConnectorAuthStatusResponse({
      a: { user_auth_status: 'connected' },
      b: { user_auth_status: 'not_connected' },
      c: { user_auth_status: 'not_applicable' },
    });

    expect(result).toEqual({
      a: { userAuthStatus: 'connected' },
      b: { userAuthStatus: 'not_connected' },
      c: { userAuthStatus: 'not_applicable' },
    });
  });
});
