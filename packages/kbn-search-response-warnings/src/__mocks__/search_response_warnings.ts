/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SearchResponseWarning } from '@kbn/data-plugin/public';

export const searchResponseTimeoutWarningMock: SearchResponseWarning = {
  type: 'timed_out',
  message: 'Data might be incomplete because your request timed out',
  reason: undefined,
};

export const searchResponseShardFailureWarningMock: SearchResponseWarning = {
  type: 'shard_failure',
  message: '3 of 4 shards failed',
  text: 'The data might be incomplete or wrong.',
  reason: {
    type: 'illegal_argument_exception',
    reason: 'Field [__anonymous_] of type [boolean] does not support custom formats',
  },
};

export const searchResponseWarningsMock: SearchResponseWarning[] = [
  searchResponseTimeoutWarningMock,
  searchResponseShardFailureWarningMock,
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
