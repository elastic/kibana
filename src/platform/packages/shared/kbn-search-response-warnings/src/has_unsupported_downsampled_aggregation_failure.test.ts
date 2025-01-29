/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { hasUnsupportedDownsampledAggregationFailure } from './has_unsupported_downsampled_aggregation_failure';

describe('hasUnsupportedDownsampledAggregationFailure', () => {
  test('should return false when unsupported_aggregation_on_downsampled_index shard failure does not exist', () => {
    expect(
      hasUnsupportedDownsampledAggregationFailure({
        type: 'incomplete',
        requestName: 'My request',
        clusters: {
          '(local)': {
            status: 'partial',
            indices: '',
            took: 25,
            timed_out: false,
            _shards: {
              total: 4,
              successful: 3,
              skipped: 0,
              failed: 1,
            },
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
        },
        openInInspector: () => {},
      })
    ).toBe(false);
  });

  test('should return true when unsupported_aggregation_on_downsampled_index shard failure exists', () => {
    expect(
      hasUnsupportedDownsampledAggregationFailure({
        type: 'incomplete',
        requestName: 'My request',
        clusters: {
          '(local)': {
            status: 'partial',
            indices: '',
            took: 25,
            timed_out: false,
            _shards: {
              total: 4,
              successful: 3,
              skipped: 0,
              failed: 1,
            },
            failures: [
              {
                shard: 0,
                index: 'sample-01-rollup',
                node: 'VFTFJxpHSdaoiGxJFLSExQ',
                reason: {
                  type: 'unsupported_aggregation_on_downsampled_index',
                  reason: 'blah blah blah timeseries data',
                },
              },
            ],
          },
        },
        openInInspector: () => {},
      })
    ).toBe(true);
  });
});
