/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Collector } from '@kbn/usage-collection-plugin/server';
import { createUsageCollectionSetupMock } from '@kbn/usage-collection-plugin/server/mocks';

const collectorSet = createUsageCollectionSetupMock();

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
