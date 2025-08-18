/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { EsWorkflow, WorkflowExecutionEngineModel } from '@kbn/workflows';
import { v4 as generateUuid } from 'uuid';
import {
  convertToSerializableGraph,
  convertToWorkflowGraph,
} from '../../common/lib/build_execution_graph/build_execution_graph';
import type { WorkflowsService } from '../workflows_management/workflows_management_service';

const findWorkflowsByTrigger = (triggerType: string): WorkflowExecutionEngineModel[] => {
  return [];
};

export class SchedulerService {
  private readonly logger: Logger;

  constructor(
    logger: Logger,
    workflowsService: WorkflowsService,
    private readonly taskManager: TaskManagerStartContract
  ) {
    this.logger = logger;
  }

  public async start() {
    this.logger.info('SchedulerService: Starting');
    // TODO: search for workflows with schedule trigger once we settle on the esmodel
    // const response = await this.workflowsService.searchWorkflows({
    //   triggerType: 'schedule',
    //   limit: 100,
    //   offset: 0,
    //   _full: true,
    // });
    // for (const workflow of response.results) {
    //   this.scheduleWorkflow(workflow);
    // }
  }

  public async scheduleWorkflow(workflow: EsWorkflow) {
    this.logger.info(`Scheduling workflow ${workflow.id}`);
    // this.workflowsExecutionEngine.scheduleWorkflow(workflow);
  }

  public async runWorkflow(
    workflow: WorkflowExecutionEngineModel,
    inputs: Record<string, any>
  ): Promise<string> {
    const executionGraph = convertToWorkflowGraph(workflow.definition);
    workflow.executionGraph = convertToSerializableGraph(executionGraph); // TODO: It's not good approach, it's temporary

    const workflowRunId = generateUuid();
    const context = {
      workflowRunId,
      inputs,
      event: 'event' in inputs ? inputs.event : undefined,
      triggeredBy: 'manual', // <-- mark as manual
    };

    const taskInstance = {
      id: `workflow:${workflowRunId}:${context.triggeredBy}`,
      taskType: 'workflow:run',
      params: {
        workflow,
        context,
      },
      state: {
        lastRunAt: null,
        lastRunStatus: null,
        lastRunError: null,
      },
      scope: ['workflows'],
      enabled: true,
    };

    await this.taskManager.schedule(taskInstance);

    return workflowRunId;
  }

  public async pushEvent(eventType: string, eventData: Record<string, any>) {
    try {
      const worklfowsToRun = findWorkflowsByTrigger(eventType);

      for (const workflow of worklfowsToRun) {
        await this.runWorkflow(workflow, {
          event: eventData,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to push event: ${error.message}`);
    }
  }
}
