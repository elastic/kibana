/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter, Logger } from '@kbn/core/server';
import type { SpacesServiceStart } from '@kbn/spaces-plugin/server';
import type { ExecutionStatus } from '@kbn/workflows';
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

export interface RouteDependencies {
  router: IRouter;
  api: WorkflowsManagementApi;
  logger: Logger;
  spaces: SpacesServiceStart;
}

export type RouteHandler = (deps: RouteDependencies) => void;
