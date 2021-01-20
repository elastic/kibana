/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { CollectorSet } from '../../plugins/usage_collection/server/collector';
import { loggerMock } from '../../core/server/logging/logger.mock';

const { makeUsageCollector } = new CollectorSet({
  logger: loggerMock.create(),
  maximumWaitTimeForAllCollectorsInS: 0,
});

interface Usage {
  [key: string]: {
    count_1?: number;
    count_2?: number;
  };
}

export const myCollector = makeUsageCollector<Usage>({
  type: 'indexed_interface_with_not_matching_schema',
  isReady: () => true,
  fetch() {
    if (Math.random()) {
      return { something: { count_1: 1 } };
    }
    return { something: { count_2: 2 } };
  },
  schema: {
    // @ts-expect-error Intentionally missing count_2
    something: {
      count_1: { type: 'long' },
    },
  },
});
