/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { coreMock } from '@kbn/core/public/mocks';
import {
  getSearchResponseInterceptedWarnings,
  removeInterceptedWarningDuplicates,
} from './get_search_response_intercepted_warnings';
import { searchResponseWarningsMock } from '../__mocks__/search_response_warnings';

const servicesMock = {
  data: dataPluginMock.createStartContract(),
  theme: coreMock.createStart().theme,
};

describe('getSearchResponseInterceptedWarnings', () => {
  const adapter = new RequestAdapter();

  it('should catch warnings correctly', () => {
    const services = {
      ...servicesMock,
    };
    services.data.search.showWarnings = jest.fn((_, callback) => {
      // @ts-expect-error for empty meta
      callback?.(searchResponseWarningsMock[0], {});
      // @ts-expect-error for empty meta
      callback?.(searchResponseWarningsMock[1], {});
      // @ts-expect-error for empty meta
      callback?.(searchResponseWarningsMock[2], {});
      // @ts-expect-error for empty meta
      callback?.(searchResponseWarningsMock[3], {});

      // plus duplicates
      // @ts-expect-error for empty meta
      callback?.(searchResponseWarningsMock[0], {});
      // @ts-expect-error for empty meta
      callback?.(searchResponseWarningsMock[1], {});
      // @ts-expect-error for empty meta
      callback?.(searchResponseWarningsMock[2], {});
    });
    expect(
      getSearchResponseInterceptedWarnings({
        services,
        adapter,
        options: {
          disableShardFailureWarning: true,
        },
      })
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "action": undefined,
          "originalWarning": Object {
            "message": "Data might be incomplete because your request timed out",
            "reason": undefined,
            "type": "timed_out",
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
      ...servicesMock,
    };
    services.data.search.showWarnings = jest.fn((_, callback) => {
      // @ts-expect-error for empty meta
      callback?.(searchResponseWarningsMock[0], {});
    });
    expect(
      getSearchResponseInterceptedWarnings({
        services,
        adapter,
        options: {
          disableShardFailureWarning: false,
        },
      })
    ).toBeUndefined();
  });
});

describe('removeInterceptedWarningDuplicates', () => {
  it('should remove duplicates successfully', () => {
    const interceptedWarnings = searchResponseWarningsMock.map((originalWarning) => ({
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
