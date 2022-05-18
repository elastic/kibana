/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createUsageCollectionSetupMock } from '@kbn/usage-collection-plugin/server/mocks';

const { makeStatsCollector } = createUsageCollectionSetupMock();

interface Usage {
  some_field: string;
}

/**
 * Stats Collectors are allowed with schema and without them.
 * We should collect them when the schema is defined.
 */

export const myCollectorWithSchema = makeStatsCollector<Usage>({
  type: 'my_stats_collector_with_schema',
  isReady: () => true,
  fetch() {
    return {
      some_field: 'abc',
    };
  },
  schema: {
    some_field: {
      type: 'keyword',
    },
  },
});

export const myCollectorWithoutSchema = makeStatsCollector({
  type: 'my_stats_collector_without_schema',
  isReady: () => true,
  fetch() {
    return {
      some_field: 'abc',
    };
  },
});
