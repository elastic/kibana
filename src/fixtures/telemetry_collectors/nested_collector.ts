/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CollectorSet, Collector } from '../../plugins/usage_collection/server/collector';
import { loggerMock } from '../../core/server/logging/logger.mock';

const collectorSet = new CollectorSet({
  logger: loggerMock.create(),
  maximumWaitTimeForAllCollectorsInS: 0,
});

interface Usage {
  locale?: string;
}

export class NestedInside {
  collector?: Collector<Usage>;
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
