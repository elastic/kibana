/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MakeSchemaFrom } from '../types';
import type { CollectorsStats } from './usage_collector_stats_collector';

export const collectorsStatsSchema: MakeSchemaFrom<CollectorsStats> = {
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
        'The total execution duration of the isReady function for all collectors in milliseconds',
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
    type: 'array',
    items: {
      name: {
        type: 'keyword',
        _meta: {
          description: 'The name of the collector',
        },
      },
      duration: {
        type: 'long',
        _meta: {
          description:
            'The execution duration of the isReady function for the collector in milliseconds',
        },
      },
    },
  },
  fetch_duration_breakdown: {
    type: 'array',
    items: {
      name: {
        type: 'keyword',
        _meta: {
          description: 'The name of the collector',
        },
      },
      duration: {
        type: 'long',
        _meta: {
          description:
            'The execution duration of the fetch function for the collector in milliseconds',
        },
      },
    },
  },
  not_ready: {
    count: {
      type: 'short',
      _meta: {
        description: 'The number of collectors that returned false from the isReady function',
      },
    },
    names: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description:
            'The name of the of collectors that returned false from the isReady function',
        },
      },
    },
  },
  not_ready_timeout: {
    count: {
      type: 'short',
      _meta: {
        description: 'The number of collectors that timedout during the isReady function',
      },
    },
    names: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description: 'The name of collectors that timedout during the isReady function',
        },
      },
    },
  },
  succeeded: {
    count: {
      type: 'short',
      _meta: {
        description: 'The number of collectors that returned true from the fetch function',
      },
    },
    names: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description: 'The name of the of collectors that returned true from the fetch function',
        },
      },
    },
  },
  failed: {
    count: {
      type: 'short',
      _meta: {
        description: 'The number of collectors that threw an error from the fetch function',
      },
    },
    names: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description: 'The name of the of collectors that threw an error from the fetch function',
        },
      },
    },
  },
};
