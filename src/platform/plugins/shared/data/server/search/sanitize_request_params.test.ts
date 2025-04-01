/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { sanitizeRequestParams } from './sanitize_request_params';

describe('sanitizeRequestParams', () => {
  test('should remove headers and body', () => {
    expect(
      sanitizeRequestParams({
        method: 'POST',
        path: '/endpoint',
        querystring: 'param1=value',
        headers: {
          Connection: 'Keep-Alive',
        },
        body: 'response',
      })
    ).toEqual({
      method: 'POST',
      path: '/endpoint',
      querystring: 'param1=value',
    });
  });

  test('should not include querystring key when its not provided', () => {
    expect(
      sanitizeRequestParams({
        method: 'POST',
        path: '/endpoint',
      })
    ).toEqual({
      method: 'POST',
      path: '/endpoint',
    });
  });
});
