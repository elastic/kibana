/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { generateSecrets } from './generate_secret';

describe('generateSecrets', () => {
  it('generates secrets for bearer authentication', () => {
    const authSpecs = [
      { types: ['bearer'] },
      {
        types: [{ type: 'bearer', defaults: {} }],
      },
    ];

    const secret = { token: 'my-secret-token' };

    for (const spec of authSpecs) {
      expect(generateSecrets(spec, secret)).toEqual({
        authType: 'bearer',
        token: 'my-secret-token',
      });
    }
  });

  it('generates secrets for api key authentication', () => {
    const secret = { apiKey: 'my-special-api-key' };
    const spec1 = {
      types: [{ type: 'api_key_header', defaults: { headerField: 'Custom-Key' } }],
    };

    expect(generateSecrets(spec1, secret)).toEqual({
      authType: 'api_key_header',
      'Custom-Key': 'my-special-api-key',
    });

    const spec2 = {
      types: [{ type: 'api_key_header', defaults: {} }],
    };

    expect(generateSecrets(spec2, secret)).toEqual({
      authType: 'api_key_header',
      'Api-Key': 'my-special-api-key',
    });
  });
});
