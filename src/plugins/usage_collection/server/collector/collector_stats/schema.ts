/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { MakeSchemaFrom } from '../types';
import type { CollectorsStats } from './usage_collector_stats_collector';

export const schema: MakeSchemaFrom<CollectorsStats> = {
  total_duration: {
    type: 'long',
    _meta: {
      description:
        'The total execution duration to grab usage stats for all collectors in milliseconds',
    },
  },
  total_is_ready_duration: {
    type: 'long',
    _meta: {
      description:
        'The total execution duration of the fetch function for all collectors in milliseconds',
    },
  },
  total_fetch_duration: {
    type: 'long',
    _meta: {
      description:
        'The total execution duration of the fetch function for all ready collectors in milliseconds',
    },
  },
  is_ready_duration_breakdown: {
    DYNAMIC_KEY: {
      type: 'long',
      _meta: {
        description:
          'The execution duration of the isReady function for the collector in milliseconds',
      },
    },
  },
  fetch_duration_breakdown: {
    DYNAMIC_KEY: {
      type: 'long',
      _meta: {
        description:
          'The execution duration of the isReady function for the collector in milliseconds',
      },
    },
  },
  not_ready: {
    count: {
      type: 'short',
    },
    names: {
      type: 'array',
      items: {
        type: 'keyword',
      },
    },
  },
  not_ready_timeout: {
    count: {
      type: 'short',
    },
    names: {
      type: 'array',
      items: {
        type: 'keyword',
      },
    },
  },
  succeeded: {
    count: {
      type: 'short',
    },
    names: {
      type: 'array',
      items: {
        type: 'keyword',
      },
    },
  },
  failed: {
    count: {
      type: 'short',
    },
    names: {
      type: 'array',
      items: {
        type: 'keyword',
      },
    },
  },
};
