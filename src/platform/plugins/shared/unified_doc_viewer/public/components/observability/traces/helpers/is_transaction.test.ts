/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isTransaction } from './is_transaction';
import { TRANSACTION_NAME } from '@kbn/apm-types';

describe('isTransaction', () => {
  it('returns true if TRANSACTION_NAME exists in flattened', () => {
    const hit = {
      flattened: {
        [TRANSACTION_NAME]: 'abc123',
      },
    } as any;
    expect(isTransaction(hit)).toBe(true);
  });

  it('returns false if TRANSACTION_NAME is null', () => {
    const hit = {
      flattened: {
        [TRANSACTION_NAME]: null,
      },
    } as any;
    expect(isTransaction(hit)).toBe(false);
  });

  it('returns false if TRANSACTION_NAME is undefined', () => {
    const hit = {
      flattened: {},
    } as any;
    expect(isTransaction(hit)).toBe(false);
  });

  it('returns false if flattened is missing', () => {
    const hit = {} as any;
    expect(isTransaction(hit)).toBe(false);
  });
});
