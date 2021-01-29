/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { CollectorSet, UsageCollector } from '../../plugins/usage_collection/server/collector';
import { loggerMock } from '../../core/server/logging/logger.mock';

const collectorSet = new CollectorSet({
  logger: loggerMock.create(),
  maximumWaitTimeForAllCollectorsInS: 0,
});

interface Usage {
  locale?: string;
}

export class NestedInside {
  collector?: UsageCollector<Usage>;
  createMyCollector() {
    this.collector = collectorSet.makeUsageCollector<Usage>({
      type: 'my_nested_collector',
      isReady: () => true,
      fetch: async () => {
        return {
          locale: 'en',
        };
      },
      schema: {
        locale: {
          type: 'keyword',
        },
      },
    });
  }
}
