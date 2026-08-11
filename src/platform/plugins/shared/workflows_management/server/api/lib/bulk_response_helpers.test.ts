/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extractBulkItemError, partitionBulkResults } from './bulk_response_helpers';

describe('extractBulkItemError', () => {
  it('returns "Unknown error" for undefined', () => {
    expect(extractBulkItemError(undefined)).toBe('Unknown error');
  });

  it('returns the string directly if error is a string', () => {
    expect(extractBulkItemError('something broke')).toBe('something broke');
  });

  it('extracts reason from an error cause object', () => {
    expect(extractBulkItemError({ type: 'mapper_parsing_exception', reason: 'bad field' })).toBe(
      'bad field'
    );
  });

  it('falls back to JSON.stringify when reason is missing', () => {
    const error = { type: 'mapper_parsing_exception' };
    expect(extractBulkItemError(error)).toBe(JSON.stringify(error));
  });

  it('falls back to JSON.stringify when reason is null', () => {
    const error = { type: 'mapper_parsing_exception', reason: null } as unknown as {
      type: string;
      reason: string;
    };
    expect(extractBulkItemError(error)).toBe(JSON.stringify(error));
  });
});

describe('partitionBulkResults', () => {
  it('returns empty arrays for empty input', () => {
    expect(partitionBulkResults([])).toEqual({ successIds: [], failures: [] });
  });

  it('collects successful IDs from index operations', () => {
    const items = [{ index: { _id: 'a', status: 200 } }, { index: { _id: 'b', status: 201 } }];
    expect(partitionBulkResults(items)).toEqual({
      successIds: ['a', 'b'],
      failures: [],
    });
  });

  it('collects successful IDs from create operations', () => {
    const items = [{ create: { _id: 'c', status: 201 } }];
    expect(partitionBulkResults(items)).toEqual({
      successIds: ['c'],
      failures: [],
    });
  });

  it('collects failures with extracted error messages', () => {
    const items = [
      {
        index: {
          _id: 'fail-1',
          status: 400,
          error: { type: 'mapper_parsing_exception', reason: 'bad mapping' },
        },
      },
      { index: { _id: 'ok', status: 200 } },
    ];
    const result = partitionBulkResults(items);
    expect(result.successIds).toEqual(['ok']);
    expect(result.failures).toEqual([{ id: 'fail-1', error: 'bad mapping' }]);
  });

  it('uses "unknown" as id when _id is missing on failure', () => {
    const items = [
      {
        index: {
          status: 400,
          error: { type: 'error', reason: 'oops' },
        },
      },
    ];
    expect(partitionBulkResults(items).failures).toEqual([{ id: 'unknown', error: 'oops' }]);
  });

  it('handles mixed index and create operations', () => {
    const items = [
      { index: { _id: 'a', status: 200 } },
      {
        create: {
          _id: 'b',
          status: 409,
          error: { type: 'version_conflict', reason: 'conflict' },
        },
      },
    ];
    const result = partitionBulkResults(items);
    expect(result.successIds).toEqual(['a']);
    expect(result.failures).toEqual([{ id: 'b', error: 'conflict' }]);
  });
});
