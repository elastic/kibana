/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isMissingSourceError } from './is_missing_source_error';

describe('isMissingSourceError', () => {
  it('matches an ES|QL unknown index failure', () => {
    expect(
      isMissingSourceError(
        new Error('verification_exception: Found 1 problem\nline 1:6: Unknown index [logs-*]')
      )
    ).toBe(true);
  });

  it('matches an unknown data source and an index_not_found reason carried on the error', () => {
    const error = new Error('Bad Request') as Error & {
      attributes: { error: { type: string; reason: string } };
    };
    error.attributes = {
      error: { type: 'index_not_found_exception', reason: 'no such index [logs]' },
    };

    expect(isMissingSourceError(new Error('Unknown data source [remote]'))).toBe(true);
    expect(isMissingSourceError(error)).toBe(true);
  });

  it('leaves other query failures alone', () => {
    expect(isMissingSourceError(undefined)).toBe(false);
    expect(isMissingSourceError(new Error('parsing_exception: mismatched input'))).toBe(false);
  });
});
