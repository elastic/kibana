/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

export const WORKFLOW_EXECUTION_LOGS_INDEX_MAPPINGS: MappingTypeMapping = {
  dynamic: false,
  properties: {
    '@timestamp': {
      type: 'date',
    },
    spaceId: {
      type: 'keyword',
    },
    message: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
          ignore_above: 1024,
        },
      },
    },
    level: {
      type: 'keyword',
    },
    workflow: {
      type: 'object',
      properties: {
        id: {
          type: 'keyword',
        },
        name: {
          type: 'text',
          fields: {
            keyword: {
              type: 'keyword',
              ignore_above: 256,
            },
          },
        },
        execution_id: {
          type: 'keyword',
        },
        step_id: {
          type: 'keyword',
        },
        step_name: {
          type: 'text',
          fields: {
            keyword: {
              type: 'keyword',
              ignore_above: 256,
            },
          },
        },
        step_type: {
          type: 'keyword',
        },
      },
    },
    event: {
      type: 'object',
      properties: {
        action: {
          type: 'keyword',
        },
        category: {
          type: 'keyword',
        },
        type: {
          type: 'keyword',
        },
        provider: {
          type: 'keyword',
        },
        outcome: {
          type: 'keyword',
        },
        duration: {
          type: 'long',
        },
        start: {
          type: 'date',
        },
        end: {
          type: 'date',
        },
      },
    },
    error: {
      type: 'object',
      properties: {
        message: {
          type: 'text',
          fields: {
            keyword: {
              type: 'keyword',
              ignore_above: 1024,
            },
          },
        },
        type: {
          type: 'keyword',
        },
        stack_trace: {
          type: 'text',
        },
      },
    },
    tags: {
      type: 'keyword',
    },
  },
};
