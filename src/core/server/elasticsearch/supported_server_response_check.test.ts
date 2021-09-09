/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isNotFoundFromUnsupportedServer } from './supported_server_response_check';

describe('#isNotFoundFromUnsupportedServer', () => {
  it('returns true with not found response from unsupported server', () => {
    const rawResponse = {
      statusCode: 404,
      headers: {},
    };

    const result = isNotFoundFromUnsupportedServer(rawResponse);
    expect(result).toBe(true);
  });

  it('returns false with not found response from supported server', async () => {
    const rawResponse = {
      statusCode: 404,
      headers: { 'x-elastic-product': 'Elasticsearch' },
    };

    const result = isNotFoundFromUnsupportedServer(rawResponse);
    expect(result).toBe(false);
  });

  it('returns false when not a 404', async () => {
    const rawResponse = {
      statusCode: 200,
      headers: { 'x-elastic-product': 'Elasticsearch' },
    };

    const result = isNotFoundFromUnsupportedServer(rawResponse);
    expect(result).toBe(false);
  });
});
