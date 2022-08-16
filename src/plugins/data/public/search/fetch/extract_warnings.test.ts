/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { estypes } from '@elastic/elasticsearch';
import { extractWarnings } from './extract_warnings';

describe('extract search response warnings', () => {
  it('extracts timeout warning', () => {
    expect(
      extractWarnings({
        took: 999,
        timed_out: true,
        _shards: {} as estypes.ShardStatistics,
        hits: { hits: [] },
      })
    ).toEqual({
      shardFailures: undefined,
      timedOut: { title: 'Data might be incomplete because your request timed out' },
      rawResponse: {
        took: 999,
        timed_out: true,
        _shards: {} as estypes.ShardStatistics,
        hits: { hits: [] },
      },
    });
  });

  it('extracts shards failed warning', () => {
    expect(
      extractWarnings({
        _shards: {
          failed: 77,
          total: 79,
        },
      } as estypes.SearchResponse)
    ).toEqual({
      shardFailures: {
        text: 'The data you are seeing might be incomplete or wrong.',
        title: '77 of 79 shards failed',
      },
      timedOut: undefined,
      rawResponse: {
        _shards: {
          failed: 77,
          total: 79,
        },
      },
    });
  });

  it('extracts multiple warning types', () => {
    const warnings = extractWarnings({
      timed_out: true,
      _shards: {
        failed: 77,
        total: 79,
      },
    } as estypes.SearchResponse);
    expect(warnings.shardFailures?.title).toBeDefined();
    expect(warnings.timedOut?.title).toBeDefined();
  });
});
