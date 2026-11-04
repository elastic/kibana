/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ignoredErrorsFilter, RESIZE_OBSERVER_LOOP_ERROR } from './ignored_errors_filter';
import type { Payload } from './types';

describe('ignoredErrorsFilter', () => {
  it('drops errors with an ignored message and keeps the rest', () => {
    const payload: Payload = {
      transactions: [],
      errors: [
        { exception: { type: '', message: RESIZE_OBSERVER_LOOP_ERROR } },
        { exception: { type: 'Error', message: 'Unexpected error' } },
      ],
    };

    expect(ignoredErrorsFilter(payload)).toEqual({
      transactions: [],
      errors: [{ exception: { type: 'Error', message: 'Unexpected error' } }],
    });
  });

  it('keeps errors that only match on type', () => {
    const payload: Payload = {
      transactions: [],
      errors: [{ exception: { type: RESIZE_OBSERVER_LOOP_ERROR, message: 'Unexpected error' } }],
    };

    expect(ignoredErrorsFilter(payload)).toEqual({
      transactions: [],
      errors: [{ exception: { type: RESIZE_OBSERVER_LOOP_ERROR, message: 'Unexpected error' } }],
    });
  });

  it('keeps errors without an exception', () => {
    const payload: Payload = { transactions: [], errors: [{ id: 'error-without-exception' }] };

    expect(ignoredErrorsFilter(payload)).toEqual({
      transactions: [],
      errors: [{ id: 'error-without-exception' }],
    });
  });

  it('does not throw if the payload has no errors', () => {
    const payload: Payload = { transactions: [] } as Partial<Payload> as Payload;

    expect(() => ignoredErrorsFilter(payload)).not.toThrow();
    expect(ignoredErrorsFilter(payload)).toEqual({ transactions: [] });
  });
});
