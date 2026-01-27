/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type { SpacesServiceStart } from '@kbn/spaces-plugin/server';
import type { ExecutionStatus, ExecutionType } from '@kbn/workflows';
import type { WorkflowsRouter } from '../../types';
import type { WorkflowsManagementApi } from '../workflows_management_api';

// Pagination constants
export const MAX_PAGE_SIZE = 100; // Limit to prevent performance issues with large result sets

/**
 * Helper function to parse execution statuses from query parameters
 * Handles both single string and array of strings
 */
export function parseExecutionStatuses(
  statuses: string | ExecutionStatus[] | undefined
): ExecutionStatus[] | undefined {
  if (!statuses) return undefined;
  return typeof statuses === 'string' ? ([statuses] as ExecutionStatus[]) : statuses;
}

/**
 * Helper function to parse execution types from query parameters
 * Handles both single string and array of strings
 */
export function parseExecutionTypes(
  executionTypes?: ExecutionType | ExecutionType[] | undefined
): ExecutionType[] | undefined {
  if (!executionTypes) return undefined;
  return typeof executionTypes === 'string'
    ? ([executionTypes] as ExecutionType[])
    : executionTypes;
}

export interface RouteDependencies {
  router: WorkflowsRouter;
  api: WorkflowsManagementApi;
  logger: Logger;
  spaces: SpacesServiceStart;
}

export type RouteHandler = (deps: RouteDependencies) => void;
