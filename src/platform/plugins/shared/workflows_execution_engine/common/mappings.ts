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

export const WORKFLOWS_EXECUTIONS_INDEX = '.workflows-executions';
export const WORKFLOWS_STEP_EXECUTIONS_INDEX = '.workflows-step-executions';

export const WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS: MappingTypeMapping = {
  dynamic: false,
  properties: {
    spaceId: {
      type: 'keyword',
    },
    id: {
      type: 'keyword',
    },
    workflowId: {
      type: 'keyword',
    },
    status: {
      type: 'keyword',
    },
    workflowDefinition: {
      type: 'object',
      enabled: false,
    },
    createdAt: {
      type: 'date',
    },
    isTestRun: {
      type: 'boolean',
    },
    // Only exists in single step test executions
    stepId: {
      type: 'keyword',
    },
    createdBy: {
      type: 'keyword',
    },
    executedBy: {
      type: 'keyword',
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
    triggeredBy: {
      type: 'keyword',
    },
    eventChainDepth: {
      type: 'long',
    },
    eventChainVisitedWorkflowIds: {
      type: 'keyword',
    },
    dispatchEventId: {
      type: 'keyword',
    },
    concurrencyGroupKey: {
      type: 'keyword',
    },
  },
};

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
    // Indexed so we can filter HITL `wait_for_input` step executions across
    // all workflows in a space (Inbox history listing). Step type is always
    // present in `_source`; lifting it into the index mapping is additive
    // (`putMapping` handles existing indices in place — see
    // `createOrUpdateIndex`). Pre-deploy terminated rows won't be queryable
    // by this field until they are rewritten, which is acceptable for a
    // brand-new feature.
    stepType: {
      type: 'keyword',
    },
    // HITL audit fields: written synchronously when a responder submits a
    // response (before Task Manager runs the resume). Lets every client
    // (Kibana inbox, Slack bot, agent builder, raw API) detect "responded
    // but not yet resumed" by reading the same step doc — no per-client
    // overlay state required. These are the strategic surgical extension
    // of the workflow-execution-level audit fields tracked in
    // [kibana#256603](https://github.com/elastic/kibana/pull/256603) /
    // [security-team#16706](https://github.com/elastic/security-team/issues/16706);
    // keeping the audit on the step row makes the data durable across
    // multiple HITL steps in the same workflow execution.
    respondedBy: {
      type: 'keyword',
    },
    respondedAt: {
      type: 'date',
    },
    channel: {
      type: 'keyword',
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
      // milliseconds
      type: 'long',
    },
  },
};
