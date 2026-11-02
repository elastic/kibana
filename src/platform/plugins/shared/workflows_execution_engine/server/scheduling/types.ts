/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { CoreStart, Logger } from '@kbn/core/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { WorkflowRepository } from '@kbn/workflows';
import type { ConcurrencyManager } from '../concurrency/concurrency_manager';
import type { WorkflowsExecutionEngineConfig } from '../config';
import type { StepExecutionRepository } from '../repositories/step_execution_repository';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import type { InternalResumeWorkflowExecution } from '../types';
import type { WorkflowTaskManager } from '../workflow_task_manager/workflow_task_manager';

/** The slice of Core start services the scheduling logic reads. */
export type SchedulingCoreStart = Pick<
  CoreStart,
  'security' | 'userProfile' | 'elasticsearch' | 'http'
>;

/** The workflow lookups the scheduling logic performs. */
export type SchedulingWorkflowRepository = Pick<
  WorkflowRepository,
  | 'getWorkflow'
  | 'getWorkflowExecutionStates'
  | 'isWorkflowEnabled'
  | 'isWorkflowEnabledRealtime'
  | 'isManagedChildAdmissibleRealtime'
>;

/**
 * Explicit dependencies of the "schedule a workflow run" logic. Everything is passed in so the
 * logic can be constructed without booting the plugins (e.g. from a task pod).
 */
export interface SchedulingDeps {
  coreStart: SchedulingCoreStart;
  licensing: Pick<LicensingPluginStart, 'getLicense'>;
  taskManager: TaskManagerStartContract;
  /** Used to resolve the kibana URL when rendering the concurrency group key. */
  cloudSetup: CloudSetup | undefined;
  config: Pick<WorkflowsExecutionEngineConfig, 'eventDriven'>;
  logger: Logger;
  workflowRepository: SchedulingWorkflowRepository;
  workflowExecutionRepository: WorkflowExecutionRepository;
  stepExecutionRepository: StepExecutionRepository;
  workflowTaskManager: WorkflowTaskManager;
  /** May be undefined before `start()`; concurrency enforcement is then skipped (with a warning). */
  concurrencyManager: ConcurrencyManager | undefined;
  /** Resolved lazily at call time: the plugin only creates the handler later in `start()`. */
  getInternalResumeWorkflowExecution: () => InternalResumeWorkflowExecution | undefined;
}
