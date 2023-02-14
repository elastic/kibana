/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  BulkIndexByScrollFailure,
  DeleteByQueryResponse,
} from '@elastic/elasticsearch/lib/api/types';

export const createDeleteByQueryResponse = (
  failures: BulkIndexByScrollFailure[] = []
): DeleteByQueryResponse => {
  return {
    took: 147,
    timed_out: false,
    total: 119,
    deleted: 119,
    batches: 1,
    version_conflicts: 0,
    noops: 0,
    retries: {
      bulk: 0,
      search: 0,
    },
    throttled_millis: 0,
    requests_per_second: -1.0,
    throttled_until_millis: 0,
    failures,
  };
};
