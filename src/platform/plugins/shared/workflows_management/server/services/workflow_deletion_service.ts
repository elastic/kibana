/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowDeletionDeps } from './types';
import { deleteWorkflows } from '../api/lib/workflow_deletion';
import { disableAllWorkflows } from '../api/lib/workflow_disable_all';
import type { DeleteWorkflowsResponse } from '../api/workflows_management_api';

export class WorkflowDeletionService {
  constructor(private readonly deps: WorkflowDeletionDeps) {}

  async deleteWorkflows(
    ids: string[],
    spaceId: string,
    options?: { force?: boolean }
  ): Promise<DeleteWorkflowsResponse> {
    return deleteWorkflows({
      ids,
      spaceId,
      force: options?.force ?? false,
      storage: this.deps.workflowStorage,
      esClient: this.deps.esClient,
      taskScheduler: this.deps.getTaskScheduler(),
      logger: this.deps.logger,
      getWorkflowExecutions: this.deps.getWorkflowExecutions,
    });
  }

  async disableAllWorkflows(): Promise<{
    total: number;
    disabled: number;
    failures: Array<{ id: string; error: string }>;
  }> {
    return disableAllWorkflows({
      storage: this.deps.workflowStorage,
      taskScheduler: this.deps.getTaskScheduler(),
      logger: this.deps.logger,
    });
  }
}
