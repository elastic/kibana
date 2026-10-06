/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution } from '@kbn/workflows';
import { handlePostExecutionLoop } from './handle_post_execution_loop';

/** Retries pending identity-failure cleanup without replaying cleanup for other terminal executions. */
export const completeIdentityFailureCleanup = async (
  execution: EsWorkflowExecution,
  params: Parameters<typeof handlePostExecutionLoop>[0]
): Promise<void> => {
  if (!execution.context?.serviceAccountFailureCleanupPending) return;
  await handlePostExecutionLoop(params);
};
