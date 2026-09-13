/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getBulkUpdaterWriteResult } from './bulk_updater_write_result';

describe('getBulkUpdaterWriteResult', () => {
  it('maps updated, noop, and missing outcomes', () => {
    expect(getBulkUpdaterWriteResult({ id: 'a', index: '.idx', result: 'updated' })).toBe(
      'updated'
    );
    expect(getBulkUpdaterWriteResult({ id: 'a', index: '.idx', result: 'noop' })).toBe('noop');
    expect(
      getBulkUpdaterWriteResult({
        id: 'a',
        index: '',
        error: { type: 'document_missing_exception', reason: 'missing' },
      })
    ).toBe('not_found');
    expect(getBulkUpdaterWriteResult(undefined)).toBe('not_found');
  });

  it('throws on unexpected ES errors', () => {
    expect(() =>
      getBulkUpdaterWriteResult({
        id: 'a',
        index: '.idx',
        error: { type: 'cluster_block_exception', reason: 'blocked' },
      })
    ).toThrow('Bulk updater write failed for a');
  });
});
