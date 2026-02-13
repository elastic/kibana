/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * API versioning constants for workflows routes.
 * Public routes are exposed to external clients; internal (e.g. connectors) are Kibana-only.
 */
export const API_VERSIONS = {
  public: {
    v1: '2025-02-13',
  },
  internal: {
    v1: '1',
  },
} as const;

/**
 * Centralized API path constants for workflows_management.
 * Used by both server routes and public UI to ensure consistency.
 */
export const WORKFLOWS_API_BASE_PATH = '/api/workflows';

/**
 * Path templates and full paths for workflow management API routes.
 * Use these constants when registering routes or calling the API.
 */
export const WORKFLOWS_API_PATHS = {
  /** GET - List/search workflows (with query params). Also used for GET /api/workflows (RESTful). */
  LIST: `${WORKFLOWS_API_BASE_PATH}`,
  /** POST - Create a single workflow */
  CREATE: `${WORKFLOWS_API_BASE_PATH}`,
  /** DELETE - Bulk delete workflows (body: { ids }) */
  BULK_DELETE: `${WORKFLOWS_API_BASE_PATH}`,
  /** POST - Search workflows (legacy; prefer GET LIST with query params) */
  SEARCH: `${WORKFLOWS_API_BASE_PATH}/search`,
  /** GET - Workflow stats */
  STATS: `${WORKFLOWS_API_BASE_PATH}/stats`,
  /** GET - Workflow aggregations */
  AGGS: `${WORKFLOWS_API_BASE_PATH}/aggs`,
  /** GET - Available connectors */
  CONNECTORS: `${WORKFLOWS_API_BASE_PATH}/connectors`,
  /** GET - Workflow JSON schema */
  JSON_SCHEMA: `${WORKFLOWS_API_BASE_PATH}/workflow-json-schema`,
  /** POST - Test workflow */
  TEST: `${WORKFLOWS_API_BASE_PATH}/test`,
  /** POST - Test single step */
  TEST_STEP: `${WORKFLOWS_API_BASE_PATH}/testStep`,
  /** POST - Bulk create workflows */
  BULK_CREATE: `${WORKFLOWS_API_BASE_PATH}/_bulk_create`,
  /** GET/PUT/DELETE - Single workflow by id (use with .replace('{id}', id)) */
  BY_ID: `${WORKFLOWS_API_BASE_PATH}/{id}`,
  /** POST - Run workflow */
  RUN: `${WORKFLOWS_API_BASE_PATH}/{id}/run`,
  /** POST - Clone workflow */
  CLONE: `${WORKFLOWS_API_BASE_PATH}/{id}/clone`,
} as const;

/**
 * Base path for workflow execution resources (flat; no workflowId in path).
 * Use this for get/cancel/logs/step by executionId only.
 */
export const WORKFLOWS_EXECUTIONS_API_BASE_PATH = '/api/workflows-executions';

/**
 * Path templates for single-execution operations (flat; executionId only).
 * Use the helper functions getExecutionByIdPath, getExecutionCancelPath, etc.
 */
export const WORKFLOWS_EXECUTIONS_API_PATHS = {
  /** GET - Get execution by id */
  BY_ID: `${WORKFLOWS_EXECUTIONS_API_BASE_PATH}/{executionId}`,
  /** POST - Cancel execution */
  CANCEL: `${WORKFLOWS_EXECUTIONS_API_BASE_PATH}/{executionId}/cancel`,
  /** GET - Execution logs */
  LOGS: `${WORKFLOWS_EXECUTIONS_API_BASE_PATH}/{executionId}/logs`,
  /** GET - Step execution */
  STEP: `${WORKFLOWS_EXECUTIONS_API_BASE_PATH}/{executionId}/steps/{stepId}`,
} as const;

/**
 * Path templates for workflow execution list (nested under a workflow).
 * List remains workflow-scoped: GET /api/workflows/{workflowId}/executions
 */
export const WORKFLOW_EXECUTIONS_API_PATHS = {
  /** GET - List executions for a workflow */
  LIST: `${WORKFLOWS_API_BASE_PATH}/{workflowId}/executions`,
} as const;

/**
 * Helper to build path for a single workflow resource
 */
export function getWorkflowPath(id: string): string {
  return WORKFLOWS_API_PATHS.BY_ID.replace('{id}', id);
}

/**
 * Helper to build path for run workflow
 */
export function getWorkflowRunPath(id: string): string {
  return WORKFLOWS_API_PATHS.RUN.replace('{id}', id);
}

/**
 * Helper to build path for clone workflow
 */
export function getWorkflowClonePath(id: string): string {
  return WORKFLOWS_API_PATHS.CLONE.replace('{id}', id);
}

/**
 * Helper to build path for listing executions of a workflow
 */
export function getWorkflowExecutionsListPath(workflowId: string): string {
  return WORKFLOW_EXECUTIONS_API_PATHS.LIST.replace('{workflowId}', workflowId);
}

/**
 * Helper to build path for execution by id (flat; executionId only)
 */
export function getExecutionByIdPath(executionId: string): string {
  return WORKFLOWS_EXECUTIONS_API_PATHS.BY_ID.replace('{executionId}', executionId);
}

/**
 * Helper to build path for cancel execution (flat; executionId only)
 */
export function getExecutionCancelPath(executionId: string): string {
  return WORKFLOWS_EXECUTIONS_API_PATHS.CANCEL.replace('{executionId}', executionId);
}

/**
 * Helper to build path for execution logs (flat; executionId only)
 */
export function getExecutionLogsPath(executionId: string): string {
  return WORKFLOWS_EXECUTIONS_API_PATHS.LOGS.replace('{executionId}', executionId);
}

/**
 * Helper to build path for step execution (flat; executionId and stepId only)
 */
export function getStepExecutionByIdPath(executionId: string, stepId: string): string {
  return WORKFLOWS_EXECUTIONS_API_PATHS.STEP.replace('{executionId}', executionId).replace(
    '{stepId}',
    stepId
  );
}
