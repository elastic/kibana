/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';

export interface EventLoopDelaysUsageReport {
  daily: Array<{
    processId: number;
    instanceUuid: string;
    lastUpdatedAt: string;
    fromTimestamp: string;
    min: number;
    max: number;
    mean: number;
    exceeds: number;
    stddev: number;
    percentiles: {
      '50': number;
      '75': number;
      '95': number;
      '99': number;
    };
  }>;
}

export const eventLoopDelaysUsageSchema: MakeSchemaFrom<EventLoopDelaysUsageReport> = {
  daily: {
    type: 'array',
    items: {
      processId: {
        type: 'long',
        _meta: {
          description: 'The process id of the monitored kibana instance.',
        },
      },
      instanceUuid: {
        type: 'keyword',
        _meta: {
          description: 'The uuid of the kibana instance.',
        },
      },
      fromTimestamp: {
        type: 'date',
        _meta: {
          description: 'Timestamp at which the histogram started monitoring.',
        },
      },
      lastUpdatedAt: {
        type: 'date',
        _meta: {
          description: 'Latest timestamp this histogram object was updated this day.',
        },
      },
      min: {
        type: 'long',
        _meta: {
          description: 'The minimum recorded event loop delay in ms.',
        },
      },
      max: {
        type: 'long',
        _meta: {
          description: 'The maximum recorded event loop delay in ms.',
        },
      },
      mean: {
        type: 'long',
        _meta: {
          description: 'The mean of the recorded event loop delays in ms.',
        },
      },
      exceeds: {
        type: 'long',
        _meta: {
          description:
            'The number of times the event loop delay exceeded the maximum 1 hour eventloop delay threshold.',
        },
      },
      stddev: {
        type: 'long',
        _meta: {
          description: 'The standard deviation of the recorded event loop delays  in ms.',
        },
      },
      percentiles: {
        '50': {
          type: 'long',
          _meta: {
            description: 'The 50th accumulated percentile distribution in ms',
          },
        },
        '75': {
          type: 'long',
          _meta: {
            description: 'The 75th accumulated percentile distribution in ms',
          },
        },
        '95': {
          type: 'long',
          _meta: {
            description: 'The 95th accumulated percentile distribution in ms',
          },
        },
        '99': {
          type: 'long',
          _meta: {
            description: 'The 99th accumulated percentile distribution in ms',
          },
        },
      },
    },
  },
};
