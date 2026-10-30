/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSearchErrorReason } from './search_error';

describe('getSearchErrorReason', () => {
  it("reads Elasticsearch's reason rather than the async search id", () => {
    const error = Object.assign(new Error('FkpZcGNlZW9rUjd1QmlyZFBf'), {
      statusCode: 429,
      attributes: {
        error: {
          type: 'status_exception',
          reason: 'FkpZcGNlZW9rUjd1QmlyZFBf',
          caused_by: { type: 'circuit_breaking_exception', reason: '[parent] Data too large' },
        },
      },
    });
    expect(getSearchErrorReason(error)).toBe('[parent] Data too large');
  });

  it('falls back to the message of any other error', () => {
    expect(getSearchErrorReason(new Error('network down'))).toBe('network down');
  });
});
