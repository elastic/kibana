/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

export const PLUGIN_ID = 'workflowsExecutionEngine';
export const PLUGIN_NAME = 'Workflows Execution Engine';

export const WORKFLOWS_EXECUTION_STATE_INDEX = '.workflows-execution-state';

export const WORKFLOWS_EXECUTION_STATE_INDEX_MAPPINGS: MappingTypeMapping = {
  dynamic: false,
  properties: {
    id: {
      type: 'keyword',
    },
    spaceId: {
      type: 'keyword',
    },
    workflowId: {
      type: 'keyword',
    },
    workflowRunId: {
      type: 'keyword',
    },
    type: {
      type: 'keyword',
    },
    status: {
      type: 'keyword',
    },
    concurrencyGroupKey: {
      type: 'keyword',
    },
    createdAt: {
      type: 'date',
    },
  },
};
