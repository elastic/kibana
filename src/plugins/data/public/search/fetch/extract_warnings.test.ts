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
  it('should extract warnings from response with shard failures', () => {
    const response = {
      took: 25,
      timed_out: false,
      _shards: {
        total: 4,
        successful: 2,
        skipped: 0,
        failed: 2,
        failures: [
          {
            shard: 0,
            index: 'sample-01-rollup',
            node: 'VFTFJxpHSdaoiGxJFLSExQ',
            reason: {
              type: 'illegal_argument_exception',
              reason:
                'Field [kubernetes.container.memory.available.bytes] of type [aggregate_metric_double] is not supported for aggregation [percentiles]',
            },
          },
        ],
      },
      hits: { total: 18239, max_score: null, hits: [] },
      aggregations: {},
    };

    expect(extractWarnings(response)).toEqual([
      {
        isShardFailure: true,
        message: '2 of 4 shards failed',
        text: 'The data you are seeing might be incomplete or wrong.',
        type: 'illegal_argument_exception',
      },
    ]);
  });

  it('should extract timeout warning', () => {
    const warnings = {
      took: 999,
      timed_out: true,
      _shards: {} as estypes.ShardStatistics,
      hits: { hits: [] },
    };
    expect(extractWarnings(warnings)).toEqual([
      {
        isTimeout: true,
        message: 'Data might be incomplete because your request timed out',
        type: 'timed_out',
      },
    ]);
  });

  it('should extract shards failed warning notification', () => {
    const warnings = {
      _shards: {
        failed: 77,
        total: 79,
      },
    } as estypes.SearchResponse;
    expect(extractWarnings(warnings)).toEqual([
      {
        isShardFailure: true,
        message: '77 of 79 shards failed',
        text: 'The data you are seeing might be incomplete or wrong.',
        type: 'generic_shard_warning',
      },
    ]);
  });

  it('should extract shards failed warning failure reason type', () => {
    const warnings = extractWarnings({
      _shards: {
        failed: 77,
        total: 79,
      },
    } as estypes.SearchResponse);
    expect(warnings).toEqual([
      {
        isShardFailure: true,
        message: '77 of 79 shards failed',
        text: 'The data you are seeing might be incomplete or wrong.',
        type: 'generic_shard_warning',
      },
    ]);
  });

  it('extracts multiple warning notifications', () => {
    const warnings = extractWarnings({
      timed_out: true,
      _shards: {
        failed: 77,
        total: 79,
      },
    } as estypes.SearchResponse);
    const [shardFailures, timedOut] = [
      warnings.filter(({ isShardFailure }) => isShardFailure === true),
      warnings.filter(({ isTimeout }) => isTimeout === true),
    ];
    expect(shardFailures[0]!.message).toBeDefined();
    expect(timedOut[0]!.message).toBeDefined();
  });

  it('should not include shardStats or types fields if there are no warnings', () => {
    const warnings = extractWarnings({
      timed_out: false,
      _shards: {
        failed: 0,
        total: 9000,
      },
    } as estypes.SearchResponse);

    expect(warnings).toEqual([]);
  });
});
