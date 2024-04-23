/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { toPartialResponseAfterTimeout } from './to_partial_response';
import { IEsSearchResponse } from '../../../common';

describe('toPartialResponseAfterTimeout', () => {
  it('should transform a non-CCS response', () => {
    const response = {
      id: 'FnRKOG10dG5OUXItUTNGUE5HNW9iU1Eed3l6LUVycTVTVGl1LWtDSVdta2VkQToxODQ5NzQ3',
      rawResponse: {
        took: 4498,
        timed_out: false,
        terminated_early: false,
        num_reduce_phases: 0,
        _shards: {
          total: 15,
          successful: 0,
          skipped: 10,
          failed: 0,
        },
        hits: {
          total: 0,
          max_score: null,
          hits: [],
        },
      },
      isPartial: true,
      isRunning: true,
      total: 15,
      loaded: 0,
      isRestored: true,
      requestParams: {
        method: 'POST',
        path: '/kibana_sample_data_logs/_async_search',
        querystring:
          'batched_reduce_size=64&ccs_minimize_roundtrips=true&wait_for_completion_timeout=200ms&keep_on_completion=true&keep_alive=60000ms&ignore_unavailable=true&expand_wildcards=all&preference=1706739464897',
      },
    };

    const expected = {
      id: 'FnRKOG10dG5OUXItUTNGUE5HNW9iU1Eed3l6LUVycTVTVGl1LWtDSVdta2VkQToxODQ5NzQ3',
      rawResponse: {
        took: 4498,
        timed_out: true,
        terminated_early: false,
        num_reduce_phases: 0,
        _shards: {
          total: 15,
          successful: 0,
          skipped: 10,
          failed: 0,
        },
        hits: {
          total: 0,
          max_score: null,
          hits: [],
        },
      },
      isPartial: true,
      isRunning: false,
      total: 15,
      loaded: 0,
      isRestored: true,
      requestParams: {
        method: 'POST',
        path: '/kibana_sample_data_logs/_async_search',
        querystring:
          'batched_reduce_size=64&ccs_minimize_roundtrips=true&wait_for_completion_timeout=200ms&keep_on_completion=true&keep_alive=60000ms&ignore_unavailable=true&expand_wildcards=all&preference=1706739464897',
      },
    };

    const actual = toPartialResponseAfterTimeout(response);
    expect(actual).toEqual(expected);
  });

  it('should transform a CCS response', () => {
    const response: IEsSearchResponse = {
      id: 'FmZBc2NuYlhsU1JxSk5LZXNRczVxdEEed3l6LUVycTVTVGl1LWtDSVdta2VkQToxODUzODUx',
      rawResponse: {
        took: 4414,
        timed_out: false,
        terminated_early: false,
        num_reduce_phases: 2,
        _shards: {
          total: 22,
          successful: 8,
          skipped: 11,
          failed: 0,
        },
        _clusters: {
          total: 2,
          successful: 1,
          skipped: 0,
          running: 1,
          partial: 0,
          failed: 0,
          details: {
            '(local)': {
              status: 'running',
              indices:
                'qbserve-2024-01-22,qbserve-2024-01-23,qbserve-2024-01-31,qbserve-2024-01-30,qbserve-2024-01-19,qbserve-2024-01-17,qbserve-2024-01-18,qbserve-2024-01-29,qbserve-2024-01-15,qbserve-2024-01-26,qbserve-2024-01-16,qbserve-2024-01-27,qbserve-2024-01-24,qbserve-2024-01-25',
              timed_out: false,
            },
            remote1: {
              status: 'successful',
              indices: 'kibana_sample_data_logs',
              took: 13,
              timed_out: false,
              _shards: {
                total: 8,
                successful: 8,
                skipped: 2,
                failed: 0,
              },
            },
          },
        },
        hits: {
          max_score: null,
          hits: [],
        },
      },
      isPartial: true,
      isRunning: true,
      total: 22,
      loaded: 8,
      isRestored: true,
      requestParams: {
        method: 'POST',
        path: '/kibana_sample_data_logs%2C*%3Akibana_sample_data_logs/_async_search',
        querystring:
          'batched_reduce_size=64&ccs_minimize_roundtrips=true&wait_for_completion_timeout=200ms&keep_on_completion=true&keep_alive=60000ms&ignore_unavailable=true&preference=1706739464897',
      },
    };

    const expected = {
      id: 'FmZBc2NuYlhsU1JxSk5LZXNRczVxdEEed3l6LUVycTVTVGl1LWtDSVdta2VkQToxODUzODUx',
      rawResponse: {
        took: 4414,
        timed_out: false,
        terminated_early: false,
        num_reduce_phases: 2,
        _shards: {
          total: 22,
          successful: 8,
          skipped: 11,
          failed: 0,
        },
        _clusters: {
          total: 2,
          successful: 1,
          skipped: 0,
          running: 1,
          partial: 0,
          failed: 0,
          details: {
            '(local)': {
              status: 'partial',
              indices:
                'qbserve-2024-01-22,qbserve-2024-01-23,qbserve-2024-01-31,qbserve-2024-01-30,qbserve-2024-01-19,qbserve-2024-01-17,qbserve-2024-01-18,qbserve-2024-01-29,qbserve-2024-01-15,qbserve-2024-01-26,qbserve-2024-01-16,qbserve-2024-01-27,qbserve-2024-01-24,qbserve-2024-01-25',
              timed_out: true,
            },
            remote1: {
              status: 'successful',
              indices: 'kibana_sample_data_logs',
              took: 13,
              timed_out: false,
              _shards: {
                total: 8,
                successful: 8,
                skipped: 2,
                failed: 0,
              },
            },
          },
        },
        hits: {
          max_score: null,
          hits: [],
        },
      },
      isPartial: true,
      isRunning: false,
      total: 22,
      loaded: 8,
      isRestored: true,
      requestParams: {
        method: 'POST',
        path: '/kibana_sample_data_logs%2C*%3Akibana_sample_data_logs/_async_search',
        querystring:
          'batched_reduce_size=64&ccs_minimize_roundtrips=true&wait_for_completion_timeout=200ms&keep_on_completion=true&keep_alive=60000ms&ignore_unavailable=true&preference=1706739464897',
      },
    };

    const actual = toPartialResponseAfterTimeout(response);
    expect(actual).toEqual(expected);
  });
});
