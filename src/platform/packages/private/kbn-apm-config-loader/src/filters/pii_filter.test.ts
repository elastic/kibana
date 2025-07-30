/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isPlainObject } from 'lodash';
import { piiFilter } from './pii_filter';

interface Payload {
  context?: {
    user?: any;
    [key: string]: any;
  };
  [key: string]: any;
}

const isPayload = (result: unknown): result is Payload => isPlainObject(result) && result !== null;

describe('piiFilter', () => {
  it('redacts all keys in a valid user object', () => {
    const payload: Payload = {
      context: {
        user: {
          id: '123',
          username: 'alice',
          email: 'alice@example.com',
        },
      },
    };
    const result = piiFilter({ ...payload });
    expect(isPayload(result) && result.context?.user).toEqual({
      id: '[REDACTED]',
      username: '[REDACTED]',
      email: '[REDACTED]',
    });
  });

  it('replaces non-object user context with { id: "[INVALID]" }', () => {
    const payloads: Payload[] = [
      { context: { user: 'not-an-object' } },
      { context: { user: 42 } },
      { context: { user: null } },
      { context: { user: undefined } },

      { context: { user: [1, 2, 3] } },
    ];
    for (const payload of payloads) {
      const result = piiFilter({ ...payload });
      expect(isPayload(result) && result.context?.user).toEqual({ id: '[INVALID]' });
    }
  });

  it('replaces user context with { id: "[INVALID]" } on any error', () => {
    const payloads: Payload[] = [
      // Proxy is not a valid user context
      {
        context: {
          user: new Proxy(
            { username: 'alice' },
            {
              set(target, prop) {
                if (prop === 'username') {
                  throw new Error('Access denied');
                }
                return true;
              },
            }
          ),
        },
      },
      // Object.freeze is not a valid user context
      { context: { user: Object.freeze({ username: 'alice' }) } },
    ];

    for (const payload of payloads) {
      const result = piiFilter({ ...payload });
      expect(isPayload(result) && result.context?.user).toEqual({ id: '[INVALID]' });
    }
  });

  it('does not modify payloads without user context', () => {
    const payload: Payload = { context: {} };
    const result = piiFilter({ ...payload });
    expect(result).toEqual(payload);
  });

  it('does not throw if context is missing', () => {
    const payload: Payload = {};
    expect(() => piiFilter({ ...payload })).not.toThrow();
    expect(piiFilter({ ...payload })).toEqual(payload);
  });
});
