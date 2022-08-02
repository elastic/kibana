/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createUsageCollectionSetupMock } from '@kbn/usage-collection-plugin/server/mocks';

const { makeUsageCollector } = createUsageCollectionSetupMock();

enum TELEMETRY_LAYER_TYPE {
  ES_DOCS = 'es_docs',
  ES_TOP_HITS = 'es_top_hits',
}

interface ClusterCountStats {
  min: number;
  max: number;
  total: number;
  avg: number;
}

type TELEMETRY_LAYER_TYPE_COUNTS_PER_CLUSTER = {
  [key in TELEMETRY_LAYER_TYPE]?: ClusterCountStats;
};

interface Usage {
  layerTypes: TELEMETRY_LAYER_TYPE_COUNTS_PER_CLUSTER;
}

export const myCollector = makeUsageCollector<Usage>({
  type: 'my_enum_collector',
  isReady: () => true,
  fetch() {
    return {
      layerTypes: {
        es_docs: {
          avg: 1,
          max: 2,
          min: 0,
          total: 2,
        },
      },
    };
  },
  schema: {
    layerTypes: {
      es_top_hits: {
        min: { type: 'long', _meta: { description: 'min number of es top hits layers per map' } },
        max: { type: 'long', _meta: { description: 'max number of es top hits layers per map' } },
        avg: {
          type: 'float',
          _meta: { description: 'avg number of es top hits layers per map' },
        },
        total: {
          type: 'long',
          _meta: { description: 'total number of es top hits layers in cluster' },
        },
      },
      es_docs: {
        min: { type: 'long', _meta: { description: 'min number of es document layers per map' } },
        max: { type: 'long', _meta: { description: 'max number of es document layers per map' } },
        avg: {
          type: 'float',
          _meta: { description: 'avg number of es document layers per map' },
        },
        total: {
          type: 'long',
          _meta: { description: 'total number of es document layers in cluster' },
        },
      },
    },
  },
});
