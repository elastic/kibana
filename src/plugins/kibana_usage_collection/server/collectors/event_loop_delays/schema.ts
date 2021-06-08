/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { MakeSchemaFrom } from 'src/plugins/usage_collection/server';

export interface EventLoopDelaysUsageReport {
  daily: Array<{
    processId: number;
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
      min: {
        type: 'long',
        _meta: {
          description: 'The minimum recorded event loop delay.',
        },
      },
      max: {
        type: 'long',
        _meta: {
          description: 'The maximum recorded event loop delay.',
        },
      },
      mean: {
        type: 'long',
        _meta: {
          description: 'The mean of the recorded event loop delays.',
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
          description: 'The standard deviation of the recorded event loop delays.',
        },
      },
      percentiles: {
        '50': {
          type: 'long',
          _meta: {
            description: 'The 50th accumulated percentile distribution',
          },
        },
        '75': {
          type: 'long',
          _meta: {
            description: 'The 75th accumulated percentile distribution',
          },
        },
        '95': {
          type: 'long',
          _meta: {
            description: 'The 95th accumulated percentile distribution',
          },
        },
        '99': {
          type: 'long',
          _meta: {
            description: 'The 99th accumulated percentile distribution',
          },
        },
      },
    },
  },
};
