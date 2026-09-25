/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const PLUGIN_ID = 'workflows';
export const PLUGIN_NAME = 'Workflows';

export const WORKFLOWS_INDEX = '.workflows-workflows';
export const WORKFLOWS_EXECUTIONS_INDEX = '.workflows-executions';
export const WORKFLOWS_STEP_EXECUTIONS_INDEX = '.workflows-step-executions';

export const WORKFLOWS_EXECUTIONS_MAX_RESULT_WINDOW = 10_000;

/**
 * Route that serves options list suggestions for the executions filter controls.
 *
 * `.workflows-executions` is a system index no built-in Elasticsearch role can read, so the
 * controls cannot aggregate it with the current user's credentials. This route authorizes the
 * request with the workflows execution-read privilege and queries with an internal user instead.
 */
export const WORKFLOW_EXECUTION_FILTER_SUGGESTIONS_PATH =
  '/internal/workflows/executions/_filter_suggestions';

/** Fields the executions filter controls may aggregate on. */
export const WORKFLOW_EXECUTION_FILTER_FIELDS = [
  'status',
  'workflowId',
  'executedBy',
  'triggeredBy',
  'createdBy',
  'spaceId',
  'isTestRun',
] as const;

export type WorkflowExecutionFilterField = (typeof WORKFLOW_EXECUTION_FILTER_FIELDS)[number];

/** Max `size` for GET .../executions/{id}/steps. */
export const WORKFLOW_EXECUTION_STEPS_MAX_PAGE_SIZE = 5000;

/** Max step executions embedded on GET .../executions/{id}. */
export const WORKFLOW_EXECUTION_EMBEDDED_STEPS_MAX_COUNT = 5000;

/** Page size the execution-detail UI requests. */
export const WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE = 5000;

/**
 * Pages fitting the 10000-step automatic budget. Also the hard limit for legacy runs without
 * `stepExecutionIds`, whose search fallback is bounded by Elasticsearch's `max_result_window`.
 */
export const WORKFLOW_EXECUTION_STEPS_MAX_PAGE_COUNT =
  10_000 / WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE;

/** Count of steps past the pages loaded so far. Ignores transient mget gaps on a loaded page. */
export const getOmittedStepExecutionsCount = (
  stepExecutionsTotal: number,
  loadedPageCount = 1
): number =>
  Math.max(0, stepExecutionsTotal - loadedPageCount * WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE);

/**
 * True when the server reported steps but none loaded, and that is not an
 * in-progress mget gap on a single page (those use the skeleton tree).
 */
export const areStepExecutionsUnavailable = ({
  stepExecutionsTotal,
  loadedCount,
  isInProgress,
}: {
  stepExecutionsTotal: number;
  loadedCount: number;
  isInProgress: boolean;
}): boolean =>
  loadedCount === 0 &&
  stepExecutionsTotal > 0 &&
  (!isInProgress || stepExecutionsTotal > WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE);

export const WORKFLOWS_DOCUMENTATION_URL = 'https://ela.st/workflows-docs';

// Export shared utilities that are needed by both server and client
// NOTE: buildRequestFromConnector removed from here to avoid main bundle bloat
// Import directly from './elasticsearch_request_builder' if needed

// DO NOT IMPORT MODULES HERE. Otherwise it will inflate the initial plugin bundle size.
