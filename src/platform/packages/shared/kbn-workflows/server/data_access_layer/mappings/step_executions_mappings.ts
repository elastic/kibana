/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

import { TOKEN_USAGE_MAPPING } from './token_usage_mapping';

export const WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS: MappingTypeMapping = {
  dynamic: false,
  properties: {
    spaceId: {
      type: 'keyword',
    },
    id: {
      type: 'keyword',
    },
    stepId: {
      type: 'keyword',
    },
    stepType: {
      type: 'keyword',
    },
    workflowRunId: {
      type: 'keyword',
    },
    workflowId: {
      type: 'keyword',
    },
    status: {
      type: 'keyword',
    },
    hitl: {
      type: 'object',
      properties: {
        respondedBy: {
          type: 'keyword',
        },
        respondedAt: {
          type: 'date',
        },
        channel: {
          type: 'keyword',
        },
      },
    },
    isTestRun: {
      type: 'boolean',
    },
    startedAt: {
      type: 'date',
    },
    finishedAt: {
      type: 'date',
    },
    duration: {
      type: 'long',
    },
    usage: TOKEN_USAGE_MAPPING,
  },
};
