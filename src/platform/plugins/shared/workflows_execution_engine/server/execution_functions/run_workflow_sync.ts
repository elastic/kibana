/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import apm from 'elastic-apm-node';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { EsWorkflowExecution } from '@kbn/workflows';
import { setupDependencies } from './setup_dependencies';
import { validateSyncWorkflow } from './validate_sync_workflow';
import type { WorkflowsExecutionEngineConfig } from '../config';
import type {
  StepExecutionPersistence,
  WorkflowExecutionPersistence,
} from '../repositories/execution_persistence';
import type { WorkflowsExecutionEnginePluginStart } from '../types';
import type { ContextDependencies } from '../workflow_context_manager/types';
import { workflowExecutionLoop } from '../workflow_execution_loop';

export const runWorkflowSync = async ({
  workflowExecution,
  request,
  abortController,
  logger,
  config,
  dependencies,
  workflowsExecutionEngine,
  workflowExecutionRepository,
  stepExecutionRepository,
}: {
  workflowExecution: EsWorkflowExecution;
  request: KibanaRequest;
  abortController: AbortController;
  logger: Logger;
  config: WorkflowsExecutionEngineConfig;
  dependencies: ContextDependencies;
  workflowsExecutionEngine: WorkflowsExecutionEnginePluginStart;
  workflowExecutionRepository: WorkflowExecutionPersistence;
  stepExecutionRepository: StepExecutionPersistence;
}): Promise<EsWorkflowExecution> => {
  apm.currentTransaction?.setLabel('execution_mode', 'sync');
  const setup = await setupDependencies(
    workflowExecution.id,
    workflowExecution.spaceId,
    logger,
    config,
    dependencies,
    request,
    workflowsExecutionEngine,
    { workflowExecution, workflowExecutionRepository, stepExecutionRepository }
  );

  validateSyncWorkflow(setup.workflowExecutionGraph);
  await setup.workflowRuntime.start();
  await workflowExecutionLoop({
    ...setup,
    workflowExecutionRepository: setup.workflowExecutionPersistence,
    fakeRequest: request,
    coreStart: dependencies.coreStart,
    signal: abortController.signal,
    executionMode: 'sync',
  });

  return setup.workflowExecutionState.getWorkflowExecution();
};
