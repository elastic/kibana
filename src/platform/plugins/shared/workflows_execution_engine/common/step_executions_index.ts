/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

export const WORKFLOWS_STEP_EXECUTIONS_INDEX_PREFIX = '.workflows-step-executions';

/** Alias used for reads (fans out to all backing indexes) and new writes (routes to write index). */
export const WORKFLOWS_STEP_EXECUTIONS_INDEX = WORKFLOWS_STEP_EXECUTIONS_INDEX_PREFIX;

export const WORKFLOWS_STEP_EXECUTIONS_ILM_POLICY = '.workflows-step-executions-ilm-policy';

export const WORKFLOWS_STEP_EXECUTIONS_INDEX_PATTERN = `${WORKFLOWS_STEP_EXECUTIONS_INDEX_PREFIX}-*`;

export const WORKFLOWS_STEP_EXECUTIONS_INITIAL_INDEX = `${WORKFLOWS_STEP_EXECUTIONS_INDEX_PREFIX}-000001`;

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
    workflowRunId: {
      type: 'keyword',
    },
    workflowId: {
      type: 'keyword',
    },
    status: {
      type: 'keyword',
    },
    startedAt: {
      type: 'date',
    },
    finishedAt: {
      type: 'date',
    },
    duration: {
      // milliseconds
      type: 'long',
    },
  },
};
