/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RequestAdapter } from '@kbn/inspector-plugin/common';
import type { SearchResponseShardFailureWarning } from '@kbn/data-plugin/public/search/types';
import {
  getSearchResponseInterceptedWarnings,
  removeInterceptedWarningDuplicates,
} from './get_search_response_intercepted_warnings';
import { discoverServiceMock as mockDiscoverServices } from '../__mocks__/services';

const mockWarnings: SearchResponseShardFailureWarning[] = [
  {
    type: 'shard_failure',
    message: '3 of 4 shards failed',
    text: 'The data might be incomplete or wrong.',
    reason: {
      type: 'illegal_argument_exception',
      reason: 'Field [__anonymous_] of type [boolean] does not support custom formats',
    },
  },
  {
    type: 'shard_failure',
    message: '3 of 4 shards failed',
    text: 'The data might be incomplete or wrong.',
    reason: {
      type: 'query_shard_exception',
      reason:
        'failed to create query: [.ds-kibana_sample_data_logs-2023.07.11-000001][0] Testing shard failures!',
    },
  },
  {
    type: 'shard_failure',
    message: '1 of 4 shards failed',
    text: 'The data might be incomplete or wrong.',
    reason: {
      type: 'query_shard_exception',
      reason:
        'failed to create query: [.ds-kibana_sample_data_logs-2023.07.11-000001][0] Testing shard failures!',
    },
  },
];

describe('getSearchResponseInterceptedWarnings', () => {
  const inspectorAdapters = { requests: new RequestAdapter() };

  it('should catch warnings correctly', () => {
    const services = {
      ...mockDiscoverServices,
    };
    services.data.search.showWarnings = jest.fn((adapter, callback) => {
      // @ts-expect-error for empty meta
      callback?.(mockWarnings[0], {});
      // @ts-expect-error for empty meta
      callback?.(mockWarnings[1], {});
      // @ts-expect-error for empty meta
      callback?.(mockWarnings[2], {});

      // plus duplicates
      // @ts-expect-error for empty meta
      callback?.(mockWarnings[0], {});
      // @ts-expect-error for empty meta
      callback?.(mockWarnings[1], {});
      // @ts-expect-error for empty meta
      callback?.(mockWarnings[2], {});
    });
    expect(
      getSearchResponseInterceptedWarnings({
        services,
        adapter: inspectorAdapters.requests,
        options: {
          disableShardFailureWarning: true,
        },
      })
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "action": <ShardFailureOpenModalButton
            color="primary"
            getRequestMeta={[Function]}
            isButtonEmpty={true}
            size="s"
            theme={
              Object {
                "theme$": Observable {
                  "_subscribe": [Function],
                },
              }
            }
            title="3 of 4 shards failed"
          />,
          "originalWarning": Object {
            "message": "3 of 4 shards failed",
            "reason": Object {
              "reason": "Field [__anonymous_] of type [boolean] does not support custom formats",
              "type": "illegal_argument_exception",
            },
            "text": "The data might be incomplete or wrong.",
            "type": "shard_failure",
          },
        },
        Object {
          "action": <ShardFailureOpenModalButton
            color="primary"
            getRequestMeta={[Function]}
            isButtonEmpty={true}
            size="s"
            theme={
              Object {
                "theme$": Observable {
                  "_subscribe": [Function],
                },
              }
            }
            title="3 of 4 shards failed"
          />,
          "originalWarning": Object {
            "message": "3 of 4 shards failed",
            "reason": Object {
              "reason": "failed to create query: [.ds-kibana_sample_data_logs-2023.07.11-000001][0] Testing shard failures!",
              "type": "query_shard_exception",
            },
            "text": "The data might be incomplete or wrong.",
            "type": "shard_failure",
          },
        },
        Object {
          "action": <ShardFailureOpenModalButton
            color="primary"
            getRequestMeta={[Function]}
            isButtonEmpty={true}
            size="s"
            theme={
              Object {
                "theme$": Observable {
                  "_subscribe": [Function],
                },
              }
            }
            title="1 of 4 shards failed"
          />,
          "originalWarning": Object {
            "message": "1 of 4 shards failed",
            "reason": Object {
              "reason": "failed to create query: [.ds-kibana_sample_data_logs-2023.07.11-000001][0] Testing shard failures!",
              "type": "query_shard_exception",
            },
            "text": "The data might be incomplete or wrong.",
            "type": "shard_failure",
          },
        },
      ]
    `);
  });

  it('should not catch any warnings if disableShardFailureWarning is false', () => {
    const services = {
      ...mockDiscoverServices,
    };
    services.data.search.showWarnings = jest.fn((adapter, callback) => {
      // @ts-expect-error for empty meta
      callback?.(mockWarnings[0], {});
    });
    expect(
      getSearchResponseInterceptedWarnings({
        services,
        adapter: inspectorAdapters.requests,
        options: {
          disableShardFailureWarning: false,
        },
      })
    ).toBeUndefined();
  });
});

describe('removeInterceptedWarningDuplicates', () => {
  it('should remove duplicates successfully', () => {
    const interceptedWarnings = mockWarnings.map((originalWarning) => ({
      originalWarning,
    }));

    expect(removeInterceptedWarningDuplicates([interceptedWarnings[0]])).toEqual([
      interceptedWarnings[0],
    ]);
    expect(removeInterceptedWarningDuplicates(interceptedWarnings)).toEqual(interceptedWarnings);
    expect(
      removeInterceptedWarningDuplicates([...interceptedWarnings, ...interceptedWarnings])
    ).toEqual(interceptedWarnings);
  });

  it('should return undefined if the list is empty', () => {
    expect(removeInterceptedWarningDuplicates([])).toBeUndefined();
    expect(removeInterceptedWarningDuplicates(undefined)).toBeUndefined();
  });
});
